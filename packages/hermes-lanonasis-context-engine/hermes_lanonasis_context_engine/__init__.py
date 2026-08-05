"""LanOnasis context engine plugin for Hermes Agent.

A *wireframe* ContextEngine: it conforms to the full
``agent.context_engine.ContextEngine`` ABC (so discovery, registration,
and single-slot activation all work today) but its backend calls are
stubbed. Every hook fails open — returning ``None`` / unchanged message
lists — until the LanOnasis memory DAG backend is configured.

Framing note (why a context engine, not a secret source):
The pre-LLM secret-filtering intent of the legacy ``secret-prescan``
package belongs HERE. The ``SecretSource`` contract is explicitly
read-only, startup-time env materialization with *no* content filtering
("no write-back, no arbitrary secret objects, no mid-session secret API"
— agent/secret_sources/base.py). Filtering what reaches the model is a
context-engine concern: ``select_context()`` (per-request selection) and
``compress()`` (compaction) are the two hooks where message content is
in hand. This skeleton exposes a ``filter_turn_for_egress()`` helper that
future implementations can wire into either hook.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    from agent.context_engine import ContextEngine
    from agent.context_engine import sanitize_memory_context  # noqa: F401
except ImportError:  # offline / non-Hermes venv — stub for tests
    ContextEngine = object  # type: ignore[assignment,misc]

__all__ = ["LanonasisContextEngine", "register"]


class LanonasisContextEngine(ContextEngine):  # type: ignore[misc]
    """Skeleton context engine backed by the LanOnasis memory DAG.

    Wireframe status:
      - ``is_available()`` is True only when ``LANONASIS_API_KEY`` is set.
      - ``compress()`` returns the message list UNCHANGED when the backend
        is unavailable (fail-open; never destroys conversation history).
      - ``select_context()`` returns ``None`` (no-op) by default — the
        engine never mutates persisted history.
      - Tool schemas expose the planned DAG-grep surface (``lcm_grep``
        family) but return ``{"error": ...}`` until implemented.
    """

    name = "lanonasis"

    # Token-state fields the host reads directly (run_agent.py).
    last_prompt_tokens: int = 0
    last_completion_tokens: int = 0
    last_total_tokens: int = 0
    threshold_tokens: int = 0
    context_length: int = 0
    compression_count: int = 0

    threshold_percent: float = 0.75
    protect_first_n: int = 3
    protect_last_n: int = 6
    emit_automatic_compaction_status: bool = True

    def __init__(self, api_url: str = "https://api.lanonasis.com", api_key: str = ""):
        self._api_url = api_url.rstrip("/")
        self._api_key = api_key or _env("LANONASIS_API_KEY")
        self._client = None  # httpx.Client built lazily in _ensure_client()
        self._session_id: Optional[str] = None
        # Snapshot the class-default threshold ONCE so the host's
        # update_model() guard (hasattr check) never sees None.
        self._config_threshold_percent: Optional[float] = self.threshold_percent
        self._base_threshold_percent = self.threshold_percent

    # -- identity ----------------------------------------------------------

    @property
    def is_available(self) -> bool:  # noqa: N802 — host calls is_available()
        """True when the backend credential is present (backend may still be down)."""
        return bool(self._api_key)

    def is_available_impl(self) -> bool:
        """Compatibility alias used by directory-based discovery."""
        return self.is_available

    # -- config ------------------------------------------------------------

    @classmethod
    def get_config_schema(cls) -> List[Dict[str, Any]]:
        return [
            {
                "key": "api_url",
                "label": "API URL",
                "type": "string",
                "default": "https://api.lanonasis.com",
                "required": False,
            },
            {
                "key": "api_key",
                "label": "API Key",
                "type": "secret",
                "env_var": "LANONASIS_API_KEY",
                "required": False,
            },
            {
                "key": "threshold_percent",
                "label": "Compaction threshold",
                "type": "float",
                "default": 0.75,
                "required": False,
            },
        ]

    @classmethod
    def save_config(cls, config: Dict[str, Any], hermes_home: str) -> None:
        """Persist non-secret config to {hermes_home}/plugins/lanonasis-context/config.json."""
        import os
        from pathlib import Path

        home = Path(hermes_home)
        cfg_dir = home / "plugins" / "lanonasis-context"
        cfg_dir.mkdir(parents=True, exist_ok=True)
        non_secret = {k: v for k, v in config.items() if k != "api_key"}
        path = cfg_dir / "config.json"
        os.umask(0o077)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(non_secret, f, indent=2)
        try:
            os.chmod(path, 0o600)
        except OSError:  # pragma: no cover — non-POSIX
            pass

    # -- core interface (required by the ABC) ------------------------------

    def update_from_response(self, usage: Dict[str, Any]) -> None:
        self.last_prompt_tokens = int(usage.get("prompt_tokens", 0) or 0)
        self.last_completion_tokens = int(usage.get("completion_tokens", 0) or 0)
        self.last_total_tokens = int(usage.get("total_tokens", 0) or 0)

    def should_compress(self, prompt_tokens: Optional[int] = None) -> bool:
        if prompt_tokens is None:
            prompt_tokens = self.last_prompt_tokens
        if not self.context_length:
            return False
        return prompt_tokens >= self.threshold_tokens

    def compress(
        self,
        messages: List[Dict[str, Any]],
        current_tokens: Optional[int] = None,
        focus_topic: Optional[str] = None,
        force: bool = False,
        memory_context: str = "",
    ) -> List[Dict[str, Any]]:
        """Compaction — wireframe: fails open (returns messages unchanged)."""
        if not self._backend_ready():
            logger.info(
                "lanonasis-context: backend not configured — returning messages "
                "unchanged (fail-open, nothing destroyed)"
            )
            return messages
        # TODO(wireframe): POST /api/v1/memories/compact with the message
        # list; replace the oldest protected-tail block with the returned
        # DAG summary node. Until then, fail open.
        logger.info("lanonasis-context: backend ready but compact stub not wired yet")
        return messages

    # -- optional hooks ----------------------------------------------------

    def select_context(
        self,
        request_messages: List[Dict[str, Any]],
        *,
        conversation_messages: Optional[List[Dict[str, Any]]] = None,
        incoming_message: Optional[Dict[str, Any]] = None,
        budget_tokens: int = 0,
    ) -> Optional[List[Dict[str, Any]]]:
        """Per-request context selection — fail-open no-op (never mutates history)."""
        return None

    def on_turn_complete(
        self,
        messages: List[Dict[str, Any]],
        usage: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> None:
        """Post-turn observation — wireframe no-op."""
        return None

    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        """Planned DAG-grep surface. Schemas are declared; calls error until wired."""
        return [
            {
                "name": "lcm_grep",
                "description": "Search the LanOnasis memory DAG for a phrase. "
                               "WIREFRAME: not implemented yet — returns an error.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Phrase to search for"}
                    },
                    "required": ["query"],
                },
            }
        ]

    def handle_tool_call(self, name: str, args: Dict[str, Any], **kwargs) -> str:
        if name == "lcm_grep":
            return json.dumps(
                {
                    "error": "lcm_grep is a wireframe tool — the LanOnasis DAG "
                             "backend is not wired yet",
                    "_wireframe": True,
                }
            )
        return json.dumps({"error": f"Unknown context engine tool: {name}"})

    def on_session_start(self, session_id: str, **kwargs) -> None:
        self._session_id = session_id

    def on_session_end(self, session_id: str, messages: List[Dict[str, Any]]) -> None:
        if self._client is not None:
            try:
                self._client.close()
            except Exception:  # pragma: no cover
                pass
            self._client = None

    def on_session_reset(self) -> None:
        super().on_session_reset()
        self._session_id = None

    def get_status(self) -> Dict[str, Any]:
        status = super().get_status()
        status["backend_ready"] = self._backend_ready()
        status["wireframe"] = True
        return status

    # -- helpers -----------------------------------------------------------

    def _backend_ready(self) -> bool:
        """True when we could attempt a backend call (key present + client builds)."""
        if not self._api_key:
            return False
        try:
            self._ensure_client()
            return True
        except Exception:  # pragma: no cover
            return False

    def _ensure_client(self):  # pragma: no cover — wireframe
        if self._client is None:
            import httpx

            self._client = httpx.Client(
                base_url=self._api_url,
                headers={"Authorization": f"Bearer {self._api_key}"},
                timeout=10.0,
            )
        return self._client

    def filter_turn_for_egress(self, text: str) -> str:
        """Egress sanitizer hook (future home of the secret-prescan port).

        Legacy ``secret-prescan`` filtered secrets BEFORE they reached an
        LLM. In the context-engine contract, the equivalent is sanitizing
        content at the compaction / selection egress boundary. This is the
        slot where that port lands; today it returns text unchanged.
        """
        return text


def _env(name: str) -> str:
    import os

    return os.environ.get(name, "")


def register(ctx) -> None:
    """Entry point: register the engine on the plugin context.

    Only the FIRST registered engine is accepted (Hermes enforces a
    single context-engine slot). ``register_context_engine`` rejects
    duplicates with a warning.
    """
    engine = LanonasisContextEngine()
    ctx.register_context_engine(engine)
    logger.info("lanonasis-context registered (wireframe): name=%s available=%s",
                engine.name, engine.is_available)
