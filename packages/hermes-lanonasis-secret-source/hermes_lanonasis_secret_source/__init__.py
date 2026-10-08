"""LanOnasis secret source plugin for Hermes Agent — wireframe.

Conforms to ``agent.secret_sources.base.SecretSource`` so it registers,
is discovered, and appears in ``hermes secrets status`` today. Its
``fetch()`` fails open with ``ErrorKind.NOT_CONFIGURED`` until the
LanOnasis secrets-manager backend is stable enough to materialize
credentials end-to-end.

Contract obligations this wireframe honors (from
``agent/secret_sources/base.py``):
  - READ-ONLY: resolve refs → values; no write-back, no rotation.
  - STARTUP-TIME, SYNCHRONOUS: ``fetch()`` runs once per process under
    the orchestrator's wall-clock timeout.
  - NEVER RAISES, NEVER PROMPTS: errors go in ``FetchResult.error`` +
    ``error_kind``. Interactive auth belongs in a future ``setup`` CLI.
  - SOURCES FETCH, ORCHESTRATOR APPLIES: we return what we *would*
    contribute; precedence/conflicts/os.environ writes are the
    orchestrator's job.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)

try:
    from agent.secret_sources.base import (
        SECRET_SOURCE_API_VERSION,
        ErrorKind,
        FetchResult,
        SecretSource,
    )
except ImportError:  # offline / non-Hermes venv — stub for tests
    SECRET_SOURCE_API_VERSION = 1

    class ErrorKindStub:  # pragma: no cover
        NOT_CONFIGURED = "not_configured"
        NETWORK = "network"
        AUTH_FAILED = "auth_failed"
        INTERNAL = "internal"

    ErrorKind = ErrorKindStub  # type: ignore[assignment]

    class FetchResult:  # type: ignore[no-redef]
        def __init__(self, secrets=None, applied=None, skipped=None,
                     warnings=None, error=None, error_kind=None, binary_path=None):
            self.secrets = secrets or {}
            self.applied = applied or []
            self.skipped = skipped or []
            self.warnings = warnings or []
            self.error = error
            self.error_kind = error_kind
            self.binary_path = binary_path

        @property
        def ok(self) -> bool:
            return self.error is None

    class SecretSource:  # type: ignore[no-redef]
        api_version: int = SECRET_SOURCE_API_VERSION
        name: str = ""
        label: str = ""
        shape: str = "mapped"
        scheme: Optional[str] = None

        def is_enabled(self, cfg) -> bool:
            return bool(isinstance(cfg, dict) and cfg.get("enabled"))

        def override_existing(self, cfg) -> bool:
            return bool(isinstance(cfg, dict) and cfg.get("override_existing", False))

        def protected_env_vars(self, cfg) -> frozenset:
            return frozenset()

        def fetch_timeout_seconds(self, cfg) -> float:
            return 120.0

        def config_schema(self) -> dict:
            return {}

        def remediation(self, kind, cfg) -> str:
            return ""

__all__ = ["LanonasisSecretSource", "register"]


class LanonasisSecretSource(SecretSource):  # type: ignore[misc]
    """Materializes LanOnasis secrets-manager credentials into env vars.

    Wireframe status:
      - Registered + discoverable; ``hermes secrets status`` lists it.
      - ``fetch()`` returns ``NOT_CONFIGURED`` until the backend is wired
        (default) — it never raises and never prompts.
      - When ``secrets.lanonasis.api_url`` and an access token are both
        configured, the HTTP resolve path activates (still returns
        NOT_CONFIGURED for the wireframe marker until the API contract is
        frozen).
    """

    api_version: int = SECRET_SOURCE_API_VERSION
    name: str = "lanonasis"
    label: str = "LanOnasis Secrets Manager"
    shape: str = "mapped"
    scheme: Optional[str] = "lano"  # lano://<secret-ref> references

    #: Env vars this source's own bootstrap auth must never clobber.
    #: The vault could legitimately contain LANONASIS_* vars; we must not
    #: let a fetched value overwrite the access token used to reach it.
    _PROTECTED = frozenset({"LANONASIS_SECRETS_TOKEN"})

    # -- required ----------------------------------------------------------

    def fetch(self, cfg: dict, home_path: Path) -> "FetchResult":
        """Resolve refs → values. MUST NOT raise or prompt (contract)."""
        cfg = cfg if isinstance(cfg, dict) else {}

        if not cfg.get("enabled"):
            return FetchResult(
                error="lanonasis secret source is not enabled "
                      "(secrets.lanonasis.enabled is false)",
                error_kind=_kind(ErrorKind, "NOT_CONFIGURED"),
            )

        token = cfg.get("access_token", "")
        if not token:
            return FetchResult(
                error="secrets.lanonasis.access_token is not configured — "
                      "run `hermes secrets lanonasis setup` once the backend "
                      "is live",
                error_kind=_kind(ErrorKind, "NOT_CONFIGURED"),
            )

        mapping = cfg.get("map", {})
        if not isinstance(mapping, dict) or not mapping:
            return FetchResult(
                error="secrets.lanonasis.map is empty — nothing to resolve",
                error_kind=_kind(ErrorKind, "NOT_CONFIGURED"),
            )

        # WIREFRAME: the HTTP resolve path (POST /api/v1/secrets/resolve)
        # is intentionally not wired yet — the backend contract is still
        # fragmented/untested. Return NOT_CONFIGURED with a clear marker so
        # nothing silently half-materials.
        return FetchResult(
            error="lanonasis secret source is a wireframe — the "
                  "/api/v1/secrets/resolve backend is not yet stable; "
                  "nothing was fetched",
            error_kind=_kind(ErrorKind, "NOT_CONFIGURED"),
            warnings=[
                "config present but resolve path not wired — upgrade the "
                "package when the secrets-manager backend stabilizes"
            ],
        )

    # -- optional hooks ----------------------------------------------------

    def is_enabled(self, cfg: dict) -> bool:
        """Fail-closed: never enabled unless explicitly set (unlike memory)."""
        return bool(isinstance(cfg, dict) and cfg.get("enabled"))

    def override_existing(self, cfg: dict) -> bool:
        return bool(isinstance(cfg, dict) and cfg.get("override_existing", False))

    def protected_env_vars(self, cfg: dict) -> frozenset:
        return frozenset(self._PROTECTED)

    def fetch_timeout_seconds(self, cfg: dict) -> float:
        try:
            val = float((cfg or {}).get("timeout_seconds", 30.0))
        except (TypeError, ValueError):
            return 30.0
        return val if val > 0 else 30.0

    def config_schema(self) -> dict:
        return {
            "enabled": {
                "description": "Enable this source (fail-closed; must be true)",
                "default": False,
            },
            "access_token": {
                "description": "Bootstrap token for the LanOnasis secrets manager",
                "default": "",
            },
            "map": {
                "description": "Env-var → lano://secret-ref bindings to resolve",
                "default": {},
            },
            "api_url": {
                "description": "Secrets manager base URL",
                "default": "https://api.lanonasis.com",
            },
            "override_existing": {
                "description": "May override vars already set by .env / shell",
                "default": False,
            },
            "timeout_seconds": {
                "description": "Wall-clock budget for fetch()",
                "default": 30.0,
            },
        }

    def remediation(self, kind, cfg: dict) -> str:
        """One-line actionable hint for the startup status printer."""
        if kind is not None and getattr(kind, "value", None) == "not_configured":
            return (
                "Secrets-manager backend not ready — LanOnasis secret source "
                "is a wireframe; keep secrets.lanonasis.enabled=false until "
                "the resolve API ships."
            )
        return ""


def _kind(cls, name: str):
    """Resolve ErrorKind.NOT_CONFIGURED whether the real ABC or stub is active."""
    if cls is None:
        return "not_configured"
    return getattr(cls, name, "not_configured")


def register(ctx) -> None:
    """Entry point: register the source on the plugin context.

    The orchestrator validates (SecretSource subclass, api_version match,
    lowercase unique name, shape, unique scheme) and rejects with a
    warning if any check fails.
    """
    ctx.register_secret_source(LanonasisSecretSource())
    logger.info(
        "lanonasis-secrets registered (wireframe): name=%s api_version=%d",
        "lanonasis", SECRET_SOURCE_API_VERSION,
    )
