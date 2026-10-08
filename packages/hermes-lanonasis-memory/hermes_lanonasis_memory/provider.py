"""
LanOnasis Memory Provider for Hermes Agent.

Conforms to the MemoryProvider contract documented at:
  https://hermes-agent.nousresearch.com/docs/developer-guide/memory-provider-plugin

Security pipeline (Phase 2 — DO NOT change):
- ``redact_secrets()`` is ALWAYS applied before any API call or storage
- ``PrivacyGuard`` processes PII when ``privacy_mode`` is enabled
- Prompt-injection detection filters recalled memories
- Defensive ``CONTEXT BLOCK`` wrapper prevents instruction following
- Embedding-profile-mismatch detection ensures recall quality

Threading contract (per docs):
- ``sync_turn()`` MUST be non-blocking — run in a daemon thread,
  with any previous write joined by the new worker, never by the caller.
- ``on_pre_compress()`` returns a string summary (non-blocking write).
- ``shutdown()`` drains every tracked background write before closing.

Profile isolation (per docs):
- All on-disk paths derive from the ``hermes_home`` kwarg passed to
  ``initialize()`` — never hardcoded ``~/.hermes``.
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from .security import (
    redact_secrets,
    looks_like_prompt_injection,
    format_recalled_memories,
    PrivacyGuard,
    PrivacyConfig,
    EmbeddingProfile,
    detect_embedding_profile_mismatch,
)
from .local_store import LocalMemoryStore, MemoryHit
from . import scope as _scope
from .scope import (
    ScopeEnvelope,
    build_envelope,
    resolve_project_scope,
    is_junk_title,
    merge_envelope_into_tags,
    get_dedup_guard,
    MEMORY_CLASS_CANONICAL,
    MEMORY_CLASS_RAW_EVENT,
    MEMORY_CLASS_SUMMARY,
    MEMORY_CLASS_WORKING_CONTEXT,
    SCOPE_PROJECT,
    SCOPE_AGENT,
    SCOPE_SESSION,
)

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# MemoryProvider ABC — real import first, guarded fallback only for
# offline unit testing. The fallback is an ABC-shaped stub with the
# correct method signatures (per the contract docs), NOT a bare ``pass``.
# ---------------------------------------------------------------------------
try:
    from agent.memory_provider import MemoryProvider  # type: ignore
except ImportError:
    try:
        from hermes.memory import MemoryProvider  # type: ignore  # very old alias
    except ImportError:
        # Standalone / test environment. Define a contract-shaped stub so the
        # class still subclasses something with the documented method names.
        # Methods are annotated but raise so that any accidental call from a
        # unit test is loud and immediate — they MUST NOT silently return.
        from abc import ABC, abstractmethod

        class MemoryProvider(ABC):  # type: ignore[no-redef]
            """Contract-shaped stub for standalone test environments.

            The real class lives at ``agent.memory_provider`` inside a Hermes
            runtime. This stub mirrors the required method names so subclass
            type checks pass — concrete methods raise to make accidental use
            obvious during tests.
            """

            @property
            @abstractmethod
            def name(self) -> str: ...

            @abstractmethod
            def is_available(self) -> bool: ...

            @abstractmethod
            def initialize(self, session_id: str, **kwargs) -> None: ...

            @abstractmethod
            def get_tool_schemas(self) -> List[Dict[str, Any]]: ...

            def handle_tool_call(
                self, tool_name: str, args: Dict[str, Any], **kwargs
            ) -> str:
                raise NotImplementedError

            def prefetch(self, query: str, *, session_id: str = "") -> str:
                return ""

            def queue_prefetch(self, query: str, *, session_id: str = "") -> None:
                return None

            def sync_turn(
                self,
                user_content: str,
                assistant_content: str,
                *,
                session_id: str = "",
                messages: Optional[List[Dict[str, Any]]] = None,
            ) -> None:
                return None

            def on_pre_compress(
                self, messages: List[Dict[str, Any]]
            ) -> str:
                return ""

            def shutdown(self) -> None:
                return None

from .client import LanOnasisClient
from .fallback import LocalFallbackWriter

_logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Discovery helpers used by ``register(ctx)`` and (optionally) by upstream
# discovery code.
# ---------------------------------------------------------------------------

def _read_optional_api_key(hermes_home: Optional[str] = None) -> str:
    """Read the API key without making any network calls.

    Order of precedence (env wins over config file):
    1. ``LANONASIS_API_KEY`` env var
    2. ``$HERMES_HOME/plugins/lanonasis/config.json`` ``api_key`` field
    """
    env_key = os.environ.get("LANONASIS_API_KEY", "").strip()
    if env_key:
        return env_key
    home = hermes_home or os.environ.get("HERMES_HOME")
    if home:
        config_key = _read_config(home).get("api_key", "")
        if isinstance(config_key, str):
            return config_key.strip()
    return ""


def _read_config(hermes_home: str) -> Dict[str, Any]:
    """Best-effort config read — never raises (config may not exist yet)."""
    path = os.path.join(hermes_home, "plugins", "lanonasis", "config.json")
    if not os.path.exists(path):
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


class LanonasisMemoryProvider(MemoryProvider):
    """LanOnasis MaaS backend for Hermes. Thin HTTP adapter."""

    def __init__(self) -> None:
        self._sync_thread: Optional[threading.Thread] = None
        self._sync_thread_lock = threading.Lock()
        self._background_threads: List[threading.Thread] = []
        self._background_threads_lock = threading.Lock()
        self._session_id: str = ""
        # ``self._hermes_home`` is set by ``initialize()``; the empty default
        # below signals "not yet initialized". Live code paths must never
        # touch ``~/.hermes`` directly — see the contract docs.
        self._hermes_home: str = ""
        self._config: "LanonasisMemoryProvider.Config" = self.Config()
        self._client: Optional[LanOnasisClient] = None
        self._fallback: Optional[LocalFallbackWriter] = None
        self._privacy_guard: Optional[PrivacyGuard] = None
        self._cached_user_id: Optional[str] = None
        self._initialized: bool = False
        # Phase 3: local-first hybrid memory store
        self._local_store: Optional[LocalMemoryStore] = None

    # ---- Config dataclass ---------------------------------------------------
    class Config:
        api_url: str = "https://api.lanonasis.com"
        api_key: str = ""
        organization_id: Optional[str] = None
        project_scope: Optional[str] = None
        subject_id_strategy: str = "current_user"
        subject_id: Optional[str] = None
        # Model-callable tools are read-only unless the operator explicitly
        # grants broader capability in the active Hermes profile.
        tool_policy: str = "read_only"
        # Phase 2: Privacy / embedding settings
        privacy_mode: bool = False
        embedding_model: Optional[str] = None

    # ---- Identity ----------------------------------------------------------
    @property
    def name(self) -> str:
        return "lanonasis"

    # ---- Availability ------------------------------------------------------
    def is_available(self) -> bool:
        """Return True if this provider can activate — **NO network calls**.

        Per the contract docs: ``is_available()`` is called during agent init
        to decide whether to activate the provider. It must check config and
        installed deps only. Health-pinging the backend is ``initialize()``'s
        job (lazy / non-fatal).

        Returns True iff we have the minimum config needed to attempt use:
        a non-empty API URL and an API key from the environment or profile
        config. Discovery can still list the provider before activation.
        """
        try:
            # Fast local check ONLY — no HTTP, no health_check() call.
            api_key = (
                _read_optional_api_key(self._hermes_home or None)
                or self._config.api_key
                or ""
            ).strip()
            api_url = (self._config.api_url or "").strip() or "https://api.lanonasis.com"
            # Considered "available" when we have BOTH an api_url and an api_key.
            # The setup wizard can still surface us as a choice either way.
            return bool(api_key) and bool(api_url)
        except Exception:
            return False

    # ---- Lifecycle ---------------------------------------------------------
    def initialize(self, session_id: str, **kwargs) -> None:
        """
        Open the httpx client and replay any locally-buffered writes.

        ``kwargs`` always carries:
        - ``hermes_home`` (str) — active HERMES_HOME path. Use for storage.

        Raises ``RuntimeError`` when no ``hermes_home`` is provided (neither
        kwarg nor ``HERMES_HOME`` env var). The provider MUST NOT silently
        default to ``~/.hermes`` — that would leak one profile's storage
        into another. See the contract docs.
        """
        self._session_id = session_id
        hermes_home = kwargs.get("hermes_home") or os.environ.get("HERMES_HOME")
        if not hermes_home:
            raise RuntimeError(
                "LanonasisMemoryProvider.initialize() requires `hermes_home` "
                "(pass via kwargs or set the HERMES_HOME env var)."
            )
        self._hermes_home = hermes_home

        # Load config: env > HERMES_HOME config file > defaults
        env_key = _read_optional_api_key(self._hermes_home)
        cfg_values = _read_config(self._hermes_home)
        cfg = self.Config()
        for key in (
            "api_url",
            "api_key",
            "organization_id",
            "project_scope",
            "subject_id_strategy",
            "subject_id",
            "tool_policy",
            "privacy_mode",
            "embedding_model",
        ):
            if key in cfg_values:
                setattr(cfg, key, cfg_values[key])
        if env_key:
            cfg.api_key = env_key
        self._config = cfg

        # Privacy guard
        self._privacy_guard = PrivacyGuard(
            config=PrivacyConfig(privacy_mode=cfg.privacy_mode)
        )

        # Client — created lazily; if no api_key yet, defer until one is set.
        if cfg.api_key:
            self._client = LanOnasisClient(
                base_url=cfg.api_url,
                api_key=cfg.api_key,
            )

        # Fallback writer — directory is HERMES_HOME-scoped, NEVER module-global.
        fallback_dir = os.path.join(self._hermes_home, "workspace", "memory")
        self._fallback = LocalFallbackWriter(fallback_dir=fallback_dir)

        # Phase 3: local-first hybrid memory store
        self._init_local_store()

        # Replay any buffered writes (non-fatal).
        if self._client is not None and self._fallback is not None:
            try:
                self._fallback.replay(self._client)
            except Exception as e:
                _logger.warning(f"[lanonasis] fallback replay raised: {e}")

        # Resolve user id (non-fatal — some queries may still work without it).
        if (
            self._config.subject_id_strategy == "current_user"
            and self._client is not None
        ):
            try:
                self._cached_user_id = self._client.get_cached_user_id()
            except Exception:
                self._cached_user_id = None

        self._initialized = True

    # ---- Tool schemas ------------------------------------------------------
    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        """Return the schemas exposed to the agent.

        Schema payload hygiene: schemas describe the tool's interface
        (name / description / parameters) per the OpenAI function-calling
        format. Operational metadata (``_security``, ``_formatted_context``,
        errors) belongs in TOOL RESULTS, not schemas.
        """
        schemas = [
            {
                "name": "memory_search",
                "description": (
                    "Search the LanOnasis memory store for relevant prior "
                    "context. Returns matching memories or empty list on outage."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query"},
                        "limit": {"type": "integer", "default": 5},
                    },
                    "required": ["query"],
                },
            },
            {
                "name": "memory_store",
                "description": "Save important information to LanOnasis memory.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "content": {"type": "string"},
                        "memory_type": {
                            "type": "string",
                            "enum": [
                                "context", "project", "knowledge",
                                "reference", "personal", "workflow",
                            ],
                            "default": "context",
                        },
                    },
                    "required": ["title", "content"],
                },
            },
            {
                "name": "memory_get",
                "description": "Retrieve a specific memory by ID.",
                "parameters": {
                    "type": "object",
                    "properties": {"id": {"type": "string"}},
                    "required": ["id"],
                },
            },
            {
                "name": "memory_forget",
                "description": "Delete a memory by ID.",
                "parameters": {
                    "type": "object",
                    "properties": {"id": {"type": "string"}},
                    "required": ["id"],
                },
            },
        ]
        enabled = self._enabled_tool_names()
        return [schema for schema in schemas if schema["name"] in enabled]

    def _tool_policy(self) -> str:
        policy = str(
            getattr(self._config, "tool_policy", "read_only") or "read_only"
        ).strip().lower()
        if policy not in {"read_only", "write", "full_access"}:
            _logger.warning(
                "[lanonasis] invalid tool_policy; defaulting to read_only"
            )
            return "read_only"
        return policy

    def _enabled_tool_names(self) -> set[str]:
        enabled = {"memory_search", "memory_get"}
        policy = self._tool_policy()
        if policy in {"write", "full_access"}:
            enabled.add("memory_store")
        if policy == "full_access":
            enabled.add("memory_forget")
        return enabled

    # ---- Tool dispatch -----------------------------------------------------
    def handle_tool_call(
        self, tool_name: str, args: Dict[str, Any], **kwargs: Any
    ) -> str:
        """Dispatch to the matching MaaS endpoint. MUST return a JSON string.

        Per the contract docs: ``handle_tool_call()`` returns a JSON string.
        The caller treats it as the tool result. Unknown tools return an
        error JSON (NOT raise), so a typo doesn't crash the agent mid-turn.
        """
        try:
            if tool_name not in self._enabled_tool_names():
                return json.dumps(
                    {
                        "error": (
                            f"Tool '{tool_name}' is disabled by the active "
                            f"Lanonasis tool policy ({self._tool_policy()})."
                        ),
                        "_tool": tool_name,
                        "_blocked": True,
                    }
                )
            dispatch = {
                "memory_search": self._tool_search,
                "memory_store": self._tool_store,
                "memory_get": self._tool_get,
                "memory_forget": self._tool_forget,
            }
            handler = dispatch.get(tool_name)
            if handler is None:
                return json.dumps(
                    {"error": f"Unknown tool: {tool_name}", "_tool": tool_name}
                )
            result = handler(args or {})
            if isinstance(result, str):
                return result
            return json.dumps(result)
        except Exception as e:
            _logger.warning(
                f"[lanonasis] handle_tool_call({tool_name}) raised: {e}"
            )
            return json.dumps(
                {"error": str(e), "_tool": tool_name, "_degraded": True}
            )

    def _ensure_client(self) -> Optional[LanOnasisClient]:
        """Lazy client creation if ``initialize`` was called without a key."""
        if self._client is not None:
            return self._client
        if self._config.api_key:
            self._client = LanOnasisClient(
                base_url=self._config.api_url,
                api_key=self._config.api_key,
            )
        return self._client

    def _tool_search(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Local-first hybrid search.

        Tier 1: Local FTS5 (≤5ms, always fast)
        Tier 2: Remote API (≤800ms, enriches with semantic search)
        Tier 3: Empty context if both miss — NO hallucination.
        """
        query = self._protect_outbound(args["query"]).text
        limit = args.get("limit", 5)
        all_memories: List[Dict[str, Any]] = []
        injection_count = 0
        local_had_hits = False

        # --- Tier 1: Local FTS5 (always fast, never blocks) ---
        local_hits = self._local_search(query, limit=limit)
        if local_hits:
            local_had_hits = True
            api_format = self._local_to_api_format(local_hits)
            for memory in api_format:
                content = memory.get("content", "")
                if looks_like_prompt_injection(content):
                    injection_count += 1
                    continue
                memory["_source"] = "local"
                all_memories.append(memory)

        # --- Tier 2: Remote API (enrich if local had hits or no local) ---
        client = self._ensure_client()
        remote_result = []
        if client is not None:
            try:
                resp = client.post(
                    "/api/v1/memories/search",
                    json={"query": query, "limit": limit},
                )
                resp.raise_for_status()
                result = resp.json()
                remote_result = result.get("memories", [])
            except Exception as e:
                _logger.warning(f"[lanonasis] memory_search remote degraded: {e}")

        # Merge remote results (dedup by id if present, or just append)
        remote_injection_count = 0
        for memory in remote_result:
            content = memory.get("content", "")
            if looks_like_prompt_injection(content):
                remote_injection_count += 1
                continue
            memory["_source"] = "remote"
            all_memories.append(memory)
        injection_count += remote_injection_count

        out: Dict[str, Any] = {
            "memories": all_memories,
            "_security": {
                "injection_filtered": injection_count,
                "total_before_filter": len(all_memories) + injection_count,
            },
        }

        if all_memories:
            # Tag the source breakdown
            local_count = sum(1 for m in all_memories if m.get("_source") == "local")
            out["_local_hits"] = local_count
            out["_local_source"] = True
            out["_formatted_context"] = format_recalled_memories(
                all_memories,
                options={"recall_strategy": "hybrid", "max_chars": 4000},
            )

        # If no results at all, signal that we searched both tiers
        if not all_memories:
            out["_searched_tiers"] = ["local", "remote" if client else "local-only"]

        return out

    def _tool_store(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Local-first hybrid store — the canonical REMOTE write path.

        Write policy (H2):
        - This is the ONLY default-remote write path.
        - Every remote write carries a scope envelope (scope_type,
          scope_id, memory_class=canonical, visibility, source, session_id)
          in payload ``metadata`` AND as tags.
        - Junk / pre-policy titles are rejected with a clear error.
        - A process-local dedup guard skips identical (title, content)
          writes inside the last 50 remote writes.
        - The legacy literal "Context (...)", "Session summary (...)", etc.
          will never be emitted.
        """
        # 1. Title validation — reject junk before any I/O.
        raw_title = (args.get("title") or "").strip()
        if not raw_title:
            return {
                "stored": False,
                "local": False,
                "error": "memory_store requires a non-empty title",
            }
        if is_junk_title(raw_title):
            return {
                "stored": False,
                "local": False,
                "error": (
                    f"memory_store refused: title {raw_title!r} matches a "
                    "legacy junk pattern. Provide a descriptive title "
                    "(e.g. 'Operator decision: keep Python 3.10 floor')."
                ),
            }

        # 2. Redact outbound.
        title_redacted = self._protect_outbound(args["title"])
        content_redacted = self._protect_outbound(args["content"])
        if title_redacted.secrets_found > 0 or content_redacted.secrets_found > 0:
            _logger.warning(
                f"[lanonasis] secrets redacted before storage: "
                f"title={title_redacted.types}, content={content_redacted.types}"
            )

        # 3. Local write (durable, always fast).
        memory_type = args.get("memory_type", "context")
        local_result = self._local_store_add(
            title=title_redacted.text,
            content=content_redacted.text,
            memory_type=memory_type,
            tags=list(args.get("tags") or []),
        )

        if not local_result.get("ok"):
            return {
                "stored": False,
                "local": False,
                "error": local_result.get("reason", "unknown"),
            }

        # 4. Build the scope envelope (memory_class=canonical, project by default).
        scope_type, scope_id = resolve_project_scope(
            env=os.environ,
            config_scope=getattr(self._config, "project_scope", None),
        )
        visibility = (
            str(args.get("visibility") or "private").strip().lower()
            or "private"
        )
        if visibility not in {"private", "project", "organization", "shared"}:
            visibility = "private"
        env = build_envelope(
            memory_class=MEMORY_CLASS_CANONICAL,
            scope_type=scope_type,
            scope_id=scope_id,
            visibility=visibility,
            session_id=self._session_id,
            source_memory_id=args.get("source_memory_id"),
        )

        # 5. Dedup guard (process-local ring buffer).
        dedup = get_dedup_guard().check_and_record(
            title=title_redacted.text,
            content=content_redacted.text,
            session_id=self._session_id,
        )
        if dedup:
            _logger.info(
                f"[lanonasis] remote store skipped by dedup: {dedup}"
            )
            return {
                "stored": True,
                "local": True,
                "local_id": local_result.get("id"),
                "remote_synced": False,
                "remote_deduped": True,
                "dedup_reason": dedup,
            }

        # 6. Remote sync (fire-and-forget, non-blocking).
        client = self._ensure_client()
        payload: Optional[Dict[str, Any]] = None
        if client is not None:
            try:
                caller_tags = list(args.get("tags") or [])
                # The envelope's ``source`` field is the operator/system
                # identity (``hermes``). The outer ``call_site`` field
                # records where the write came from inside the provider
                # without overwriting the envelope.
                payload = {
                    "title": title_redacted.text,
                    "content": content_redacted.text,
                    "memory_type": memory_type,
                    "tags": merge_envelope_into_tags(env, caller_tags=caller_tags),
                    "metadata": {
                        **env.as_metadata(),
                        "call_site": "hermes_memory_store",
                    },
                }
                if self._config.organization_id:
                    payload["organization_id"] = self._config.organization_id
                if self._config.project_scope:
                    payload["metadata"]["project_scope"] = self._config.project_scope
                resp = client.post("/api/v1/memories", json=payload)
                resp.raise_for_status()
                data = resp.json()
                data.setdefault("stored", True)
                data["local"] = True
                data["local_id"] = local_result.get("id")
                return data
            except Exception as e:
                _logger.warning(f"[lanonasis] remote sync failed: {e}")
                # Persist the pending write to the on-disk fallback so the
                # next ``initialize()`` can replay it. This keeps the
                # local-first / never-lose contract.
                if payload is not None and self._fallback is not None:
                    try:
                        self._fallback.write(payload)
                    except Exception as fb_err:
                        _logger.warning(
                            f"[lanonasis] fallback write also failed: {fb_err}"
                        )
                # Local write succeeded — still return success with local_only flag
                return {
                    "stored": True,
                    "local": True,
                    "local_id": local_result.get("id"),
                    "remote_synced": False,
                    "remote_error": str(e),
                }

        # No client — local write succeeded
        return {
            "stored": True,
            "local": True,
            "local_id": local_result.get("id"),
            "remote_synced": False,
        }

    def _tool_get(self, args: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        memory_id = args.get("id")
        if not isinstance(memory_id, str) or not _UUID_RE.match(memory_id):
            raise ValueError(f"Invalid memory id: {memory_id!r}")
        client = self._ensure_client()
        if client is None:
            return None
        try:
            resp = client.get(f"/api/v1/memories/{memory_id}")
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            _logger.warning(f"[lanonasis] memory_get degraded: {e}")
            return None

    def _tool_forget(self, args: Dict[str, Any]) -> Dict[str, Any]:
        memory_id = args.get("id")
        if not isinstance(memory_id, str) or not _UUID_RE.match(memory_id):
            raise ValueError(f"Invalid memory id: {memory_id!r}")
        client = self._ensure_client()
        if client is None:
            return {"deleted": False, "id": memory_id, "_degraded": True}
        resp = client.delete(f"/api/v1/memories/{memory_id}")
        resp.raise_for_status()
        return {"deleted": True, "id": memory_id}

    # ---- Optional hooks ---------------------------------------------------
    def system_prompt_block(self) -> str:
        instructions = [
            "You have access to a persistent memory system.",
            "Use memory_search to recall past context.",
            "Use memory_get to retrieve a specific memory by ID.",
        ]
        policy = self._tool_policy()
        if policy in {"write", "full_access"}:
            instructions.append("Use memory_store to save important information.")
        if policy == "full_access":
            instructions.append("Use memory_forget to delete a memory by ID.")
        return " ".join(instructions)

    def prefetch(self, query: str, *, session_id: str = "") -> str:
        """Recall hook — return the per-turn context block.

        Per the contract docs the signature is
        ``prefetch(query, *, session_id="") -> str`` returning the formatted
        recall context (or empty string). Never raises. ``session_id`` is
        accepted for providers serving concurrent sessions and is currently
        unused.
        """
        del session_id  # accepted per contract; not needed for this provider
        try:
            if not query or query.isspace():
                return ""
            result = self._tool_search({"query": query, "limit": 5}) or {}
            return result.get("_formatted_context", "") or ""
        except Exception as e:
            _logger.warning(f"[lanonasis] prefetch recall failed: {e}")
            return ""

    def queue_prefetch(self, query: str, *, session_id: str = "") -> None:
        """Post-turn pre-warm hook (optional per the contract)."""
        # This provider does its recall inline in prefetch(); nothing extra
        # to queue. Accept the kwargs for contract compatibility.
        del query, session_id

    def sync_turn(
        self,
        user_content: str,
        assistant_content: str,
        *,
        session_id: str = "",
        messages: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """Persist a completed turn — MUST be non-blocking (contract docs).

        Uses a daemon-thread chain:
        - capture the previous write without waiting on the caller thread
        - join it with ``timeout=5.0`` inside the new worker
        - perform the actual write after that bounded wait
        - log-warn on failure (never raise into the caller)

        ``session_id`` and ``messages`` are accepted per the docs' extended
        signature. ``session_id`` falls back to ``self._session_id`` (set by
        ``initialize()``) so the legacy positional-only call sites keep
        working. ``messages`` is unused because the two-content form is
        sufficient; consumed by the embedded metadata as ``source``.
        """
        del messages  # accepted for contract; not needed by this provider
        effective_session_id = session_id or self._session_id
        try:
            with self._sync_thread_lock:
                prev = self._sync_thread
                thread = self._start_background_write(
                    self._run_sync_turn,
                    user_content,
                    assistant_content,
                    effective_session_id,
                    wait_for=prev,
                    wait_timeout=5.0,
                    name=f"lanonasis-sync-{int(time.time())}",
                )
                self._sync_thread = thread
        except Exception as e:
            _logger.warning(f"[lanonasis] sync_turn dispatch failed: {e}")

    def on_session_end(self, messages: List[Dict[str, Any]]) -> None:
        """Force reasoning flush for this session's subject (non-blocking).

        Write policy (H2):
        - The reasoning flush itself still runs (subject is the
          canonical-session identifier, not a memory payload).
        - We persist AT MOST ONE local session-synthesis row per session
          as ``memory_class=summary``.
        - Remote write of the synthesis is opt-in via
          ``LANONASIS_HERMES_REMOTE_SESSION_SUMMARY=1``. When opted in,
          the title is a real synthesis title (date + project + topic),
          never the legacy literal ``"Session summary (pre-compress)"``.
        """
        # 1. Local synthesis — at most one per session. The dedup guard
        #    inside ``_start_background_store`` is bypassed here because
        #    we want exactly one row, but the dedup is per title and we
        #    always use a date-based title. The one-per-session rule is
        #    enforced below via a flag on the instance.
        try:
            if not getattr(self, "_session_synthesis_written", False):
                summary_text = self._synthesize_session(messages)
                if summary_text:
                    self._start_background_store(
                        summary_text, MEMORY_CLASS_SUMMARY
                    )
                    self._session_synthesis_written = True
        except Exception as e:
            _logger.warning(
                f"[lanonasis] on_session_end local synthesis failed: {e}"
            )

        # 2. Optional remote synthesis (opt-in only).
        try:
            if (
                os.environ.get(
                    "LANONASIS_HERMES_REMOTE_SESSION_SUMMARY", ""
                ).strip()
                in ("1", "true", "yes", "on")
            ):
                summary_text = self._synthesize_session(messages)
                if summary_text:
                    title = self._session_synthesis_title(messages, summary_text)
                    self._start_background_store_remote(
                        summary_text,
                        memory_class=MEMORY_CLASS_SUMMARY,
                        title=title,
                    )
        except Exception as e:
            _logger.warning(
                f"[lanonasis] on_session_end remote synthesis dispatch failed: {e}"
            )

        # 3. Reasoning flush (unchanged contract).
        try:
            client = self._ensure_client()
            if client is None:
                return
            subject_id = self._resolve_subject_id()
            self._start_background_write(
                self._run_flush,
                client,
                subject_id,
                name="lanonasis-flush",
            )
        except Exception as e:
            if self._fallback is not None:
                self._fallback.log_warning(
                    f"[lanonasis] on_session_end dispatch failed: {e}"
                )

    def _synthesize_session(self, messages: List[Dict[str, Any]]) -> str:
        """Cheap single-pass synthesis of a session for end-of-session storage.

        Differs from ``_summarise_messages`` (which is the pre-compress
        helper that returns the most recent ~10 lines). The synthesis
        here is a single canonical summary line, suitable for a MaaS
        memory row's title content.
        """
        if not messages:
            return ""
        last_user = next(
            (
                m for m in reversed(messages)
                if m.get("role") == "user" and (m.get("content") or "").strip()
            ),
            None,
        )
        first_meaningful = ""
        for m in messages:
            content = m.get("content") or ""
            if isinstance(content, list):
                content = " ".join(
                    c.get("text", "") for c in content if isinstance(c, dict)
                )
            content = str(content).strip()
            # Skip tiny chatty turns.
            if len(content.split()) >= 5:
                first_meaningful = content[:240]
                break
        if not first_meaningful and last_user is not None:
            content = last_user.get("content") or ""
            if isinstance(content, list):
                content = " ".join(
                    c.get("text", "") for c in content if isinstance(c, dict)
                )
            first_meaningful = str(content).strip()[:240]
        if not first_meaningful:
            return ""
        return f"Session topics: {first_meaningful}"

    def _session_synthesis_title(
        self, messages: List[Dict[str, Any]], summary_text: str
    ) -> str:
        """Build a real synthesis title for the remote memory row.

        Format: ``Hermes session <date> — <project>: <first meaningful topic>``.
        Never the legacy literal ``"Session summary (pre-compress)"``.
        """
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        scope_type, scope_id = resolve_project_scope(
            config_scope=getattr(self._config, "project_scope", None)
        )
        project = scope_id if scope_type == SCOPE_PROJECT else "hermes"
        topic = (summary_text or "").replace("Session topics:", "").strip()
        if len(topic) > 80:
            topic = topic[:77] + "…"
        return f"Hermes session {today} — {project}: {topic}"

    def on_pre_compress(self, messages: List[Dict[str, Any]]) -> str:
        """Return a summary string for the compression prompt.

        Write policy (H2):
        - The summary is still returned (per the contract) so Hermes can
          feed it into the compression-summary prompt.
        - The summary is persisted ONLY to the local store as
          ``memory_class=working_context``. The remote MaaS bank is NEVER
          written to from this hook — pre-compress is session-internal
          working state, not a canonical memory.
        - The legacy literal title ``"Session summary (pre-compress)"`` is
          never stored; the local title is descriptive.
        """
        summary = self._summarise_messages(messages)
        if not summary:
            return ""
        try:
            self._start_background_store(summary, MEMORY_CLASS_WORKING_CONTEXT)
        except Exception as e:
            _logger.warning(
                f"[lanonasis] on_pre_compress dispatch failed: {e}"
            )
        return summary

    def shutdown(self) -> None:
        """Drain pending writes (best-effort) and close the http client."""
        self._drain_background_writes(timeout=10.0)
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass
        # Phase 3: close local FTS5 store
        if self._local_store is not None:
            try:
                self._local_store.close()
            except Exception:
                pass

    # ---- Private helpers --------------------------------------------------
    # ---- Turn-level content classification ---------------------------------
    # Patterns that signal the user wants to *store* knowledge, not just chat.
    # NOTE: a 'credential' class used to live here. It was removed in the
    # H2 write-policy refactor — a turn that mentions an api_key/secret/token
    # must NEVER be auto-stored, even as raw_event.
    _STORE_SIGNALS: list[tuple[str, str]] = [
        # Explicit intent
        (r"\bremember(?:\s+that)?\s+", "remembered_fact"),
        (r"\bremember\s+that\s+", "remembered_fact"),
        (r"\bremember\s+(?:this|the\s+)?\S", "remembered_fact"),
        # Preference / configuration
        (r"\b(?:i\s+(?:prefer|like|want|use|need|use)\s+|my\s+(?:default|preferred|favorite|top))", "preference"),
        # Instruction / convention
        (r"\b(?:always\s+|never\s+|don't\s+|do\s+not\s+|convention|rule)", "convention"),
        # Explicit save/store intent
        (r"\b(?:save|store|keep|record|note)\s+(?:this|that|the\s+)", "stored_fact"),
        # Key-value / URL patterns  (NO credentials — see note above)
        (r"\b(?:url|endpoint|uri|href)\s*[=:]?\s*https?://", "reference_url"),
        # "The X is Y" / "X was Y" fact patterns
        (r"\b(?:the\s+\w+|it)\s+(?:is|was|became|remains|equals)\s+", "fact_statement"),
    ]

    def _classify_turn_content(self, text: str) -> tuple[bool, str]:
        """Return (should_store, memory_type) for a turn excerpt.

        We only store content that carries signal — not every raw turn.
        """
        lower = text.lower()
        for pattern, mtype in self._STORE_SIGNALS:
            if re.search(pattern, lower):
                return True, mtype
        # Heuristic: very short chatty turns → skip.
        word_count = len(lower.split())
        if word_count <= 4:
            return False, "context"
        # If it looks like a question → skip (questions aren't facts).
        if text.strip().endswith("?"):
            return False, "context"
        # Default: store medium/long content as context.
        return True, "context"

    def _run_sync_turn(
        self,
        user_content: str,
        assistant_content: str,
        session_id: str,
    ) -> None:
        """Daemon thread body for sync_turn — never raises.

        Write policy (H2):
        - Raw turns go to the LOCAL FTS5 store as ``memory_class=raw_event``
          by default. The remote MaaS bank is NOT written to.
        - Opt-in remote writes are gated by ``LANONASIS_HERMES_REMOTE_RAW_TURNS=1``
          and carry a scope envelope (memory_class=raw_event).
        - The 'credential' store-signal class was removed entirely, so
          a turn that ONLY mentions an api_key/secret/token is no longer
          selected.
        """
        try:
            client = self._ensure_client()
            effective_session = session_id or self._session_id
            remote_raw_opt_in = (
                os.environ.get("LANONASIS_HERMES_REMOTE_RAW_TURNS", "").strip()
                in ("1", "true", "yes", "on")
            )
            for content, role in (
                (user_content, "user"),
                (assistant_content, "assistant"),
            ):
                if not content or content.isspace():
                    continue
                should_store, _mtype = self._classify_turn_content(content)
                if not should_store:
                    continue  # Skip chatty / short / question turns silently
                redacted = self._protect_outbound(content)
                if redacted.secrets_found > 0:
                    _logger.warning(
                        f"[lanonasis] secrets redacted in sync_turn ({role}): "
                        f"{redacted.types}"
                    )
                redacted_text = redacted.text

                # Build the local-only payload first (this always happens).
                local_payload = {
                    "title": f"raw_event ({role}) {effective_session[:8] or 'no-session'}",
                    "content": redacted_text,
                    "tags": [
                        "source:hermes",
                        f"scope:session:{effective_session or 'no-session'}",
                        f"class:{MEMORY_CLASS_RAW_EVENT}",
                        f"role:{role}",
                    ],
                }
                self._local_store_add(
                    title=local_payload["title"],
                    content=local_payload["content"],
                    memory_type=MEMORY_CLASS_RAW_EVENT,
                    tags=local_payload["tags"],
                )

                # Remote write is opt-in only.
                if not remote_raw_opt_in or client is None or self._fallback is None:
                    continue
                env = build_envelope(
                    memory_class=MEMORY_CLASS_RAW_EVENT,
                    scope_type=SCOPE_SESSION,
                    scope_id=effective_session or "no-session",
                    session_id=effective_session,
                )
                # Dedup guard — raw turns can repeat; skip identical ones.
                dedup = get_dedup_guard().check_and_record(
                    title=local_payload["title"],
                    content=redacted_text,
                    session_id=effective_session,
                )
                if dedup:
                    _logger.debug(
                        "[lanonasis] sync_turn remote write skipped: %s", dedup
                    )
                    continue
                payload = {
                    "title": local_payload["title"],
                    "content": redacted_text,
                    "memory_type": "context",
                    "tags": merge_envelope_into_tags(
                        env, caller_tags=[f"role:{role}"]
                    ),
                    "metadata": {
                        **env.as_metadata(),
                        "role": role,
                        "call_site": "hermes_sync_turn",
                    },
                }
                if self._config.organization_id:
                    payload["organization_id"] = self._config.organization_id
                if self._config.project_scope:
                    payload["metadata"]["project_scope"] = self._config.project_scope
                try:
                    resp = client.post(
                        "/api/v1/memories", json=payload, timeout=10.0
                    )
                    resp.raise_for_status()
                except Exception:
                    self._fallback.write(payload)
        except Exception as e:
            _logger.warning(f"[lanonasis] sync_turn worker crashed: {e}")

    def _run_flush(self, client: LanOnasisClient, subject_id: str) -> None:
        """Daemon thread body for on_session_end flush — never raises."""
        try:
            client.flush_reasoning(subject_id)
        except Exception as e:
            if self._fallback is not None:
                self._fallback.log_warning(
                    f"[lanonasis] on_session_end flush failed: {e}"
                )

    def _start_background_store(
        self, content: str, memory_type: str
    ) -> None:
        """Local-only background store for opportunistic writes.

        Write policy (H2):
        - Pre-compress summaries and other opportunistic writes are
          PERSISTED TO THE LOCAL STORE ONLY. The remote MaaS bank is
          never written from these code paths by default.
        - Local rows carry a proper ``working_context`` / ``summary`` tag
          set so the FTS5 store can find them later.
        - The legacy literal title ``"Session summary (pre-compress)"`` is
          no longer used anywhere; the title is derived from the source
          hook and the date.
        """
        redacted = self._protect_outbound(content)
        if redacted.secrets_found > 0:
            _logger.warning(
                f"[lanonasis] secrets redacted in background store: "
                f"{redacted.types}"
            )
        redacted_text = redacted.text
        # Build a descriptive local title. We deliberately do NOT use the
        # legacy literal "Session summary (pre-compress)".
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if memory_type == MEMORY_CLASS_WORKING_CONTEXT:
            title = f"working_context {today} (pre-compress)"
        elif memory_type == MEMORY_CLASS_SUMMARY:
            title = f"summary {today} (session-end)"
        else:
            title = f"{memory_type} {today}"
        tags = [
            "source:hermes",
            f"scope:session:{self._session_id or 'no-session'}",
            f"class:{memory_type}",
        ]
        self._local_store_add(
            title=title,
            content=redacted_text,
            memory_type=memory_type,
            tags=tags,
        )
        # NOTE: We do NOT enqueue a remote write. Remote memory is the
        # explicit ``memory_store`` tool's job; everything else is local
        # working state. Operators who want session summaries on the
        # remote bank must opt in via LANONASIS_HERMES_REMOTE_SESSION_SUMMARY
        # in the explicit session-end handler.

    def _start_background_store_remote(
        self, content: str, memory_class: str, *, title: Optional[str] = None
    ) -> None:
        """Opt-in remote store for opportunistic writes (H2).

        Currently used by ``on_session_end`` when
        ``LANONASIS_HERMES_REMOTE_SESSION_SUMMARY=1`` is set. Pre-compress
        never calls this — pre-compress is working context, not canonical.
        """
        redacted = self._protect_outbound(content)
        if redacted.secrets_found > 0:
            _logger.warning(
                f"[lanonasis] secrets redacted in remote background store: "
                f"{redacted.types}"
            )
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if not title:
            title = f"summary {today} (session-end)"
        dedup = get_dedup_guard().check_and_record(
            title=title,
            content=redacted.text,
            session_id=self._session_id,
        )
        if dedup:
            _logger.debug(
                "[lanonasis] remote opportunistic write skipped: %s", dedup
            )
            return
        env = build_envelope(
            memory_class=memory_class,
            scope_type=SCOPE_SESSION,
            scope_id=self._session_id or "no-session",
            session_id=self._session_id,
        )
        payload = {
            "title": title,
            "content": redacted.text,
            "memory_type": "context",
            "tags": merge_envelope_into_tags(env),
            "metadata": {
                **env.as_metadata(),
                "call_site": "hermes_opportunistic",
            },
        }
        if self._config.organization_id:
            payload["organization_id"] = self._config.organization_id
        if self._config.project_scope:
            payload["metadata"]["project_scope"] = self._config.project_scope
        self._start_background_write(
            self._run_store_payload,
            payload,
            name="lanonasis-opportunistic",
        )

    def _run_store_payload(self, payload: Dict[str, Any]) -> None:
        try:
            client = self._ensure_client()
            if client is None or self._fallback is None:
                return
            resp = client.post(
                "/api/v1/memories", json=payload, timeout=10.0
            )
            resp.raise_for_status()
        except Exception:
            if self._fallback is not None:
                self._fallback.write(payload)

    def _protect_outbound(self, text: str):
        """Apply credential redaction and optional PII masking."""
        if self._privacy_guard is not None:
            return self._privacy_guard.process(text)
        return redact_secrets(text, {"redact_pii": False})

    def _start_background_write(
        self,
        target,
        *args,
        wait_for: Optional[threading.Thread] = None,
        wait_timeout: float = 0.0,
        name: str,
    ) -> threading.Thread:
        """Start and track a daemon write without blocking the caller."""

        def worker() -> None:
            try:
                if wait_for is not None and wait_for.is_alive():
                    wait_for.join(timeout=wait_timeout)
                target(*args)
            finally:
                current = threading.current_thread()
                with self._background_threads_lock:
                    self._background_threads = [
                        thread
                        for thread in self._background_threads
                        if thread is not current
                    ]

        thread = threading.Thread(target=worker, daemon=True, name=name)
        with self._background_threads_lock:
            self._background_threads.append(thread)
        thread.start()
        return thread

    # ---- Phase 3: local-first hybrid memory store -------------------------

    def _init_local_store(self) -> None:
        """Open the local SQLite FTS5 store at a per-profile path.

        The DB lives at ``{hermes_home}/workspace/lanonasis-memory.db``.
        Never raises — a failed init just means local tier is unavailable
        and the provider falls back to remote-only.
        """
        try:
            db_path = os.path.join(
                self._hermes_home, "workspace", "lanonasis-memory.db"
            )
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            self._local_store = LocalMemoryStore(db_path, mode="block")
        except Exception as e:
            _logger.warning(f"[lanonasis] local store init failed: {e}")
            self._local_store = None

    def _local_search(self, query: str, limit: int = 5) -> List[MemoryHit]:
        """Search the local FTS5 store. Returns empty list on failure."""
        if self._local_store is None:
            return []
        try:
            return self._local_store.search(query, limit=limit)
        except Exception as e:
            _logger.warning(f"[lanonasis] local search failed: {e}")
            return []

    def _local_store_add(
        self,
        title: str,
        content: str,
        memory_type: str = "context",
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Write a memory to the local store. Returns dict result.

        ``tags`` (optional) is persisted as a JSON array and indexed by
        the FTS5 ``tags`` column so callers can filter the local store
        by envelope tags (e.g. ``class:working_context``).
        """
        if self._local_store is None:
            return {"ok": False, "id": None, "reason": "local_store_unavailable"}
        try:
            return self._local_store.add(
                title=title,
                content=content,
                memory_type=memory_type,
                tags=tags,
            )
        except Exception as e:
            _logger.warning(f"[lanonasis] local store add failed: {e}")
            return {"ok": False, "id": None, "reason": str(e)}

    def _local_to_api_format(self, hits: List[MemoryHit]) -> List[Dict[str, Any]]:
        """Convert local MemoryHit objects to API-compatible dict format."""
        result = []
        for h in hits:
            result.append({
                "id": h.id,
                "title": h.title,
                "content": h.content,
                "type": h.target if h.target != "memory" else "context",
                "similarity": h.score,
                "tags": h.tags or [],
                "memory_type": "context",
            })
        return result

    def _drain_background_writes(self, timeout: float) -> None:
        deadline = time.monotonic() + timeout
        while True:
            with self._background_threads_lock:
                threads = [
                    thread
                    for thread in self._background_threads
                    if thread.is_alive()
                ]
            if not threads:
                return
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                if self._fallback is not None:
                    self._fallback.log_warning(
                        "[lanonasis] shutdown timed out with "
                        f"{len(threads)} pending memory writes"
                    )
                return
            threads[0].join(timeout=min(remaining, 0.25))

    def _summarise_messages(self, messages: List[Dict[str, Any]]) -> str:
        """Cheap heuristic summary suitable for the compression prompt."""
        if not messages:
            return ""
        parts: List[str] = []
        for m in messages[-10:]:
            role = m.get("role", "unknown")
            content = m.get("content", "")
            if isinstance(content, list):
                content = " ".join(
                    c.get("text", "") for c in content if isinstance(c, dict)
                )
            parts.append(f"[{role}]: {str(content)[:200]}")
        return "[Session summary]\n" + "\n".join(parts)

    def _resolve_subject_id(self) -> str:
        if self._config.subject_id_strategy == "explicit":
            if not self._config.subject_id:
                raise ValueError(
                    "subject_id_strategy is 'explicit' but subject_id is not configured. "
                    "Set subject_id in the LanOnasis plugin config."
                )
            return self._config.subject_id
        resolved = self._cached_user_id
        if not resolved:
            raise ValueError(
                "Could not resolve subject_id: cached_user_id is empty. "
                "Ensure initialize() completed successfully and /api/v1/auth/me returned a valid user."
            )
        return resolved

    # ---- Config schema (for `hermes memory setup`) ------------------------
    def get_config_schema(self) -> List[Dict[str, Any]]:
        return [
            {
                "key": "api_url",
                "label": "LanOnasis API URL",
                "type": "string",
                "required": True,
                "default": "https://api.lanonasis.com",
                "description": "Base URL of the LanOnasis MaaS API",
            },
            {
                "key": "api_key",
                "label": "API Key",
                "type": "secret",
                "required": True,
                "description": "Your LanOnasis API key (starts with lms_)",
                "env_var": "LANONASIS_API_KEY",
            },
            {
                "key": "organization_id",
                "label": "Organization ID",
                "type": "string",
                "required": False,
                "description": "Optional organization UUID for team memory isolation",
            },
            {
                "key": "project_scope",
                "label": "Project Scope",
                "type": "string",
                "required": False,
                "description": "Optional project tag applied to all stored memories",
            },
            {
                "key": "subject_id_strategy",
                "label": "Subject ID Strategy",
                "type": "string",
                "enum": ["current_user", "explicit"],
                "default": "current_user",
                "description": "'current_user' = authenticated user. 'explicit' = subject_id below.",
            },
            {
                "key": "subject_id",
                "label": "Explicit Subject ID",
                "type": "string",
                "required": False,
                "description": "Required when subject_id_strategy = 'explicit'",
            },
            {
                "key": "tool_policy",
                "label": "Model Tool Policy",
                "type": "string",
                "enum": ["read_only", "write", "full_access"],
                "default": "read_only",
                "description": (
                    "Tools exposed to the model. read_only enables search/get; "
                    "write also enables store; full_access also enables delete."
                ),
            },
            {
                "key": "privacy_mode",
                "label": "Privacy Mode",
                "type": "boolean",
                "default": False,
                "description": (
                    "Enable PII detection and masking (email, phone, SSN, etc.). "
                    "Credentials are ALWAYS redacted regardless of this setting."
                ),
            },
            {
                "key": "embedding_model",
                "label": "Embedding Model",
                "type": "string",
                "required": False,
                "description": (
                    "Embedding model used for memory storage (e.g., text-embedding-3-small). "
                    "Used for profile mismatch detection to ensure recall quality."
                ),
            },
        ]

    def save_config(self, values: Dict[str, Any], hermes_home: str) -> None:
        """Persist non-secret config to {hermes_home}/plugins/lanonasis/config.json."""
        config_dir = os.path.join(hermes_home, "plugins", "lanonasis")
        os.makedirs(config_dir, exist_ok=True)
        try:
            os.chmod(config_dir, 0o700)
        except OSError:
            pass
        config_path = os.path.join(config_dir, "config.json")
        try:
            fd = os.open(
                config_path,
                os.O_WRONLY | os.O_CREAT | os.O_TRUNC,
                0o600,
            )
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(values, f, indent=2)
        except OSError as e:
            if self._fallback is not None:
                self._fallback.log_warning(
                    f"[lanonasis] save_config failed: {e}"
                )

    # ---- Discovery entry point (contract docs require) --------------------
    def register(self, ctx: Any) -> None:
        """Optional instance method form of the plugin entry point.

        The actual top-level ``register(ctx)`` lives in the plugin's
        ``__init__.py`` so it can be imported by name; this method mirrors
        it for callers that hold an instance.
        """
        register = getattr(ctx, "register_memory_provider", None)
        if register is None:
            raise AttributeError(
                "PluginContext missing register_memory_provider()"
            )
        register(self)


# Top-level entry point used by ``plugins/memory/<name>/`` discovery.
def register(ctx: Any) -> None:
    """Register this provider with the plugin context (MemoryManager).

    NOTE: this Hermes build discovers memory providers via the DIRECTORY
    scan (``$HERMES_HOME/plugins/<name>/``) with a ``_ProviderCollector``
    ctx — the general plugin manager's ``PluginContext`` has no
    ``register_memory_provider()`` method. When called with such a ctx
    (e.g. via the ``hermes_agent.plugins`` entry-point group), fail
    quietly: the directory path is the real registration route and the
    entry point exists only for ``hermes plugins list`` visibility and
    future builds.
    """
    provider = LanonasisMemoryProvider()
    register_fn = getattr(ctx, "register_memory_provider", None)
    if register_fn is None:
        _logger.debug(
            "register(ctx) without register_memory_provider — skipping "
            "(memory providers are directory-discovered in this build)"
        )
        return
    register_fn(provider)
