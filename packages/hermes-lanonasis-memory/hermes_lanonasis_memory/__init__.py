"""LanOnasis Memory Provider Plugin for Hermes Agent.

Conforms to the contract documented at:
  https://hermes-agent.nousresearch.com/docs/developer-guide/memory-provider-plugin

The top-level ``__init__`` exposes BOTH the implementation (for direct
``from hermes_lanonasis_memory import LanonasisMemoryProvider`` use) and
the ``register(ctx)`` entry point required by the plugin discovery system.

Two load paths:

1. **pip-installed** (``pip install -e .``): the package is imported as
   ``hermes_lanonasis_memory`` under its real name. Discovery sees it via
   the ``hermes_agent.plugins`` entry point group in ``pyproject.toml``.

2. **drop-in directory** (``$HERMES_HOME/plugins/memory/lanonasis/``,
   via symlink or copy): discovery loads this file under the synthetic
   ``_hermes_user_memory.lanonasis`` namespace. Relative ``from .provider
   import …`` imports would not resolve (there is no on-disk parent
   package), so we import the implementation via the top-level
   ``hermes_lanonasis_memory`` name — which is the same module, already
   populated by the pip install.
"""

from __future__ import annotations

from typing import Any

# Absolute import (NOT relative) so this module loads cleanly under
# BOTH the canonical ``hermes_lanonasis_memory`` name (pip path) AND
# the synthetic ``_hermes_user_memory.lanonasis`` name (drop-in path).
# The pip-installed package is the source of truth in either case.
from hermes_lanonasis_memory.provider import (
    LanonasisMemoryProvider,
    register as _provider_register,
)

__version__ = "0.2.0"
__all__ = ["LanonasisMemoryProvider", "register"]


def register(ctx: Any) -> None:
    """Plugin entry point — called by Hermes' memory-plugin discovery.

    Discovery does a cheap text scan on this file looking for
    ``register_memory_provider`` / ``MemoryProvider``. Both tokens are
    present in the imported ``LanonasisMemoryProvider`` symbol below so
    this provider is picked up by either heuristic.
    """
    _provider_register(ctx)
