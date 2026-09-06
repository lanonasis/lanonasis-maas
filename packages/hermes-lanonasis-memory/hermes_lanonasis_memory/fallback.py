"""Local file fallback writer for failed LanOnasis API writes.

Profile-isolated: the directory is passed in by the caller (derived from
the active ``$HERMES_HOME``). This module no longer exposes any default
constant — live code paths MUST always pass ``fallback_dir`` explicitly,
which the provider gets from the ``hermes_home`` kwarg to ``initialize``.
Historical tests patched a module-level ``FALLBACK_DIR``; that contract
has been replaced with explicit ctor-arg plumbing.
"""

import json
import logging
import os
import sys
import tempfile
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator, Optional

try:
    import fcntl
except ImportError:  # pragma: no cover - Windows fallback is thread-only
    fcntl = None  # type: ignore[assignment]

_logger = logging.getLogger(__name__)
_thread_locks: dict[str, threading.RLock] = {}
_thread_locks_guard = threading.Lock()


def _get_thread_lock(path: str) -> threading.RLock:
    with _thread_locks_guard:
        return _thread_locks.setdefault(path, threading.RLock())


@contextmanager
def _locked_fallback_file(path: str) -> Iterator[None]:
    """Serialize append/replay for one JSONL file.

    ``flock`` provides cross-process locking on the supported Hermes
    deployment platforms. The per-path RLock also coordinates separate writer
    instances in one process and is the best-effort fallback on Windows.
    """
    lock_path = f"{path}.lock"
    flags = os.O_RDWR | os.O_CREAT
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW

    with _get_thread_lock(path):
        fd = os.open(lock_path, flags, 0o600)
        try:
            os.fchmod(fd, 0o600)
            if fcntl is not None:
                fcntl.flock(fd, fcntl.LOCK_EX)
            yield
        finally:
            if fcntl is not None:
                try:
                    fcntl.flock(fd, fcntl.LOCK_UN)
                except OSError:
                    pass
            os.close(fd)


class LocalFallbackWriter:
    """Appends failed writes to daily JSONL files for later replay."""

    def __init__(self, fallback_dir: str) -> None:
        # ``fallback_dir`` is REQUIRED — no module-level default, no env
        # fallback. The provider calls this with the active ``hermes_home``
        # in ``initialize()``. Passing nothing is a programming error.
        if not fallback_dir:
            raise ValueError(
                "LocalFallbackWriter requires an explicit `fallback_dir` "
                "(the provider must derive it from the active HERMES_HOME)."
            )
        self._dir = fallback_dir

    def write(self, payload: dict) -> None:
        """Append a failed write to today's fallback file."""
        os.makedirs(self._dir, exist_ok=True)
        try:
            os.chmod(self._dir, 0o700)
        except OSError:
            pass
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        path = os.path.join(self._dir, f"{date_str}.jsonl")
        entry = {
            **payload,
            "_fallback_at": datetime.now(timezone.utc).isoformat(),
            "_replayed": False,
        }
        with _locked_fallback_file(path):
            flags = os.O_WRONLY | os.O_CREAT | os.O_APPEND
            if hasattr(os, "O_NOFOLLOW"):
                flags |= os.O_NOFOLLOW
            elif os.path.islink(path):  # pragma: no cover - platform fallback
                raise OSError(f"Refusing symlinked fallback file: {path}")
            fd = os.open(path, flags, 0o600)
            try:
                os.fchmod(fd, 0o600)
                stream = os.fdopen(fd, "a", encoding="utf-8")
                fd = -1  # ownership transferred to stream
                with stream as f:
                    f.write(json.dumps(entry) + "\n")
            finally:
                if fd >= 0:
                    os.close(fd)

    def replay(self, client) -> None:
        """Re-submit every unreplayed fallback entry on ``initialize()``.

        Failure policy (per the contract review): ``replay()`` MUST never
        raise. Any unexpected exception on one entry is logged and that
        entry is left pending so the next session can retry it.
        """
        if not os.path.exists(self._dir):
            return

        for filename in sorted(os.listdir(self._dir)):
            if not filename.endswith(".jsonl"):
                continue

            path = os.path.join(self._dir, filename)
            try:
                with _locked_fallback_file(path):
                    self._replay_file(path, filename, client)
            except Exception as e:
                _logger.warning(
                    f"[lanonasis] fallback replay could not process {path}: {e}"
                )

    def _replay_file(self, path: str, filename: str, client) -> None:
        """Replay and atomically rewrite one file while its lock is held."""
        lines: list[str] = []

        fd = -1
        try:
            flags = os.O_RDONLY
            if hasattr(os, "O_NOFOLLOW"):
                flags |= os.O_NOFOLLOW
            elif os.path.islink(path):  # pragma: no cover - platform fallback
                raise OSError(f"Refusing symlinked fallback file: {path}")
            fd = os.open(path, flags)
            os.fchmod(fd, 0o600)
            stream = os.fdopen(fd, "r", encoding="utf-8")
            fd = -1  # ownership transferred to stream
            with stream as f:
                file_lines = f.readlines()
        except OSError as e:
            _logger.warning(
                f"[lanonasis] fallback replay could not read {path}: {e}"
            )
            return
        finally:
            if fd >= 0:
                try:
                    os.close(fd)
                except OSError:
                    pass

        for line in file_lines:
            stripped = line.strip()
            if not stripped:
                continue
            try:
                entry = json.loads(stripped)
                if entry.get("_replayed"):
                    lines.append(line)
                    continue

                payload = {
                    k: v for k, v in entry.items() if not k.startswith("_")
                }
                try:
                    resp = client.post(
                        "/api/v1/memories", json=payload, timeout=10.0
                    )
                    resp.raise_for_status()
                    entry["_replayed"] = True
                    lines.append(json.dumps(entry) + "\n")
                except Exception as submit_err:
                    _logger.warning(
                        f"[lanonasis] fallback replay submit failed: "
                        f"{submit_err}"
                    )
                    lines.append(line)
            except Exception as parse_err:
                _logger.warning(
                    f"[lanonasis] fallback replay could not parse line "
                    f"in {path}: {parse_err}"
                )
                lines.append(line)

        # Atomic write-back. The caller holds the same lock used by append.
        fd = -1
        temp_path = ""
        try:
            fd, temp_path = tempfile.mkstemp(
                prefix=f".{filename}.",
                suffix=".tmp",
                dir=self._dir,
                text=True,
            )
            os.fchmod(fd, 0o600)
            stream = os.fdopen(fd, "w", encoding="utf-8")
            fd = -1  # ownership transferred to stream
            with stream as f:
                f.writelines(lines)
            os.replace(temp_path, path)
            temp_path = ""
        except Exception as e:
            _logger.warning(
                f"[lanonasis] fallback replay could not rewrite {path}: {e}"
            )
        finally:
            if fd >= 0:
                try:
                    os.close(fd)
                except OSError:
                    pass
            if temp_path:
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

    def log_warning(self, message: str) -> None:
        """Log a warning to stderr."""
        print(message, file=sys.stderr)
