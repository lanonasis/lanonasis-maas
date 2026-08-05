"""Unit tests for LocalFallbackWriter — no network required.

Contract-related coverage:
- Constructor ``fallback_dir`` is REQUIRED (no module-level defaults).
- ``replay()`` MUST NOT raise on unexpected exceptions (per the contract
  review's ``test_fallback`` finding): corrupt lines + API failures are
  logged and the failed entries are left pending for retry.
- Profile isolation: writing under a custom ``fallback_dir`` (derived
  from ``$HERMES_HOME`` in the provider) never touches the real ``~/.hermes``
  tree.
"""

import json
import os
import tempfile
import threading
from datetime import datetime, timezone

import pytest
from unittest.mock import MagicMock, patch

from hermes_lanonasis_memory.fallback import LocalFallbackWriter


@pytest.fixture
def temp_fallback_dir():
    """Use a temp dir so tests don't pollute the real home directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


# ---------------------------------------------------------------------------
# Class: TestFallbackWrite
# ---------------------------------------------------------------------------
class TestFallbackWrite:
    def test_write_creates_daily_jsonl_file(self, temp_fallback_dir):
        writer = LocalFallbackWriter(fallback_dir=temp_fallback_dir)
        writer.write({"title": "test", "content": "hello"})
        files = [
            name for name in os.listdir(temp_fallback_dir)
            if name.endswith(".jsonl")
        ]
        assert len(files) == 1
        assert files[0].endswith(".jsonl")

    def test_write_appends_not_overwrites(self, temp_fallback_dir):
        writer = LocalFallbackWriter(fallback_dir=temp_fallback_dir)
        writer.write({"title": "first"})
        writer.write({"title": "second"})
        files = [
            name for name in os.listdir(temp_fallback_dir)
            if name.endswith(".jsonl")
        ]
        with open(os.path.join(temp_fallback_dir, files[0])) as f:
            lines = [l for l in f if l.strip()]
        assert len(lines) == 2

    def test_write_includes_fallback_timestamp(self, temp_fallback_dir):
        writer = LocalFallbackWriter(fallback_dir=temp_fallback_dir)
        writer.write({"title": "test"})
        files = [
            name for name in os.listdir(temp_fallback_dir)
            if name.endswith(".jsonl")
        ]
        with open(os.path.join(temp_fallback_dir, files[0])) as f:
            entry = json.loads(f.readline())
        assert "_fallback_at" in entry
        assert "_replayed" in entry
        assert entry["_replayed"] is False

    def test_write_preserves_original_fields(self, temp_fallback_dir):
        writer = LocalFallbackWriter(fallback_dir=temp_fallback_dir)
        writer.write({
            "title": "My Memory", "content": "some text", "memory_type": "context",
        })
        files = [
            name for name in os.listdir(temp_fallback_dir)
            if name.endswith(".jsonl")
        ]
        with open(os.path.join(temp_fallback_dir, files[0])) as f:
            entry = json.loads(f.readline())
        assert entry["title"] == "My Memory"
        assert entry["content"] == "some text"
        assert entry["memory_type"] == "context"

    def test_write_repairs_existing_file_permissions(self, temp_fallback_dir):
        date_name = datetime.now(timezone.utc).strftime("%Y-%m-%d.jsonl")
        date_file = os.path.join(temp_fallback_dir, date_name)
        with open(date_file, "w", encoding="utf-8"):
            pass
        os.chmod(date_file, 0o644)

        LocalFallbackWriter(temp_fallback_dir).write({"title": "private"})

        assert os.stat(date_file).st_mode & 0o777 == 0o600

    def test_write_rejects_symlinked_data_file(self, temp_fallback_dir, tmp_path):
        date_name = datetime.now(timezone.utc).strftime("%Y-%m-%d.jsonl")
        target = tmp_path / "outside.jsonl"
        target.write_text("outside\n", encoding="utf-8")
        os.symlink(target, os.path.join(temp_fallback_dir, date_name))

        with pytest.raises(OSError):
            LocalFallbackWriter(temp_fallback_dir).write({"title": "blocked"})

        assert target.read_text(encoding="utf-8") == "outside\n"


# ---------------------------------------------------------------------------
# Class: TestFallbackReplay
# ---------------------------------------------------------------------------
class TestFallbackReplay:
    def test_replay_does_nothing_when_dir_missing(self, temp_fallback_dir):
        with tempfile.TemporaryDirectory() as some_other:
            writer = LocalFallbackWriter(fallback_dir=some_other)
            mock_client = MagicMock()
            writer.replay(mock_client)  # must not raise
            mock_client.post.assert_not_called()

    def test_replay_resubmits_unreplayed_entries(self, temp_fallback_dir):
        date_file = os.path.join(temp_fallback_dir, "2026-05-08.jsonl")
        entry = {
            "title": "old write", "content": "test",
            "_fallback_at": "2026-05-08T00:00:00", "_replayed": False,
        }
        with open(date_file, "w") as f:
            f.write(json.dumps(entry) + "\n")
        writer = LocalFallbackWriter(fallback_dir=temp_fallback_dir)
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp
        writer.replay(mock_client)
        mock_client.post.assert_called_once()
        payload = mock_client.post.call_args.kwargs.get("json", {})
        assert "_fallback_at" not in payload
        assert "_replayed" not in payload

    def test_replay_marks_entry_replayed_on_success(self, temp_fallback_dir):
        date_file = os.path.join(temp_fallback_dir, "2026-05-08.jsonl")
        entry = {
            "title": "replay me", "content": "test",
            "_fallback_at": "2026-05-08T00:00:00", "_replayed": False,
        }
        with open(date_file, "w") as f:
            f.write(json.dumps(entry) + "\n")
        writer = LocalFallbackWriter(fallback_dir=temp_fallback_dir)
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp
        writer.replay(mock_client)
        with open(date_file) as f:
            lines = [l for l in f if l.strip()]
        updated = json.loads(lines[0])
        assert updated["_replayed"] is True

    def test_replay_leaves_entry_unreplayed_on_api_failure(self, temp_fallback_dir):
        date_file = os.path.join(temp_fallback_dir, "2026-05-08.jsonl")
        entry = {
            "title": "keep me", "content": "test",
            "_fallback_at": "2026-05-08T00:00:00", "_replayed": False,
        }
        with open(date_file, "w") as f:
            f.write(json.dumps(entry) + "\n")
        writer = LocalFallbackWriter(fallback_dir=temp_fallback_dir)
        mock_client = MagicMock()
        mock_client.post.side_effect = Exception("API down")
        writer.replay(mock_client)  # must not raise
        with open(date_file) as f:
            lines = [l for l in f if l.strip()]
        still_pending = json.loads(lines[0])
        assert still_pending["_replayed"] is False

    def test_replay_swallows_unexpected_exceptions_on_lines(self, temp_fallback_dir):
        """Contract: ``replay()`` MUST never raise into the caller, even
        when individual lines trigger unexpected exceptions. Bad lines
        are left for later inspection; good lines still attempt replay.
        """
        path = os.path.join(temp_fallback_dir, "2026-07-16.jsonl")
        with open(path, "w") as f:
            f.write("not-valid-json\n")
            f.write(
                json.dumps({
                    "title": "good", "_fallback_at": "2026-07-16T00:00:00",
                    "_replayed": False,
                }) + "\n"
            )
        writer = LocalFallbackWriter(fallback_dir=temp_fallback_dir)
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp
        writer.replay(mock_client)  # MUST NOT raise
        mock_client.post.assert_called_once()

    def test_replay_temp_file_is_owner_only(
        self, temp_fallback_dir, monkeypatch
    ):
        date_file = os.path.join(temp_fallback_dir, "2026-07-16.jsonl")
        with open(date_file, "w", encoding="utf-8") as f:
            f.write(json.dumps({"title": "private", "_replayed": False}) + "\n")

        observed_modes = []
        real_replace = os.replace

        def capture_mode(source, destination):
            observed_modes.append(os.stat(source).st_mode & 0o777)
            real_replace(source, destination)

        monkeypatch.setattr(os, "replace", capture_mode)
        client = MagicMock()
        client.post.return_value = MagicMock()

        LocalFallbackWriter(temp_fallback_dir).replay(client)

        assert observed_modes == [0o600]
        assert os.stat(date_file).st_mode & 0o777 == 0o600

    def test_replay_rejects_symlinked_data_file(
        self, temp_fallback_dir, tmp_path
    ):
        target = tmp_path / "outside.jsonl"
        target.write_text(
            json.dumps({"title": "outside", "_replayed": False}) + "\n",
            encoding="utf-8",
        )
        os.symlink(
            target,
            os.path.join(temp_fallback_dir, "2026-07-16.jsonl"),
        )
        client = MagicMock()

        LocalFallbackWriter(temp_fallback_dir).replay(client)

        client.post.assert_not_called()
        assert '"_replayed": false' in target.read_text(encoding="utf-8")

    def test_write_waits_for_replay_without_losing_entry(self, temp_fallback_dir):
        date_name = datetime.now(timezone.utc).strftime("%Y-%m-%d.jsonl")
        date_file = os.path.join(temp_fallback_dir, date_name)
        with open(date_file, "w", encoding="utf-8") as f:
            f.write(json.dumps({"title": "old", "_replayed": False}) + "\n")

        replay_started = threading.Event()
        allow_replay = threading.Event()
        client = MagicMock()

        def blocked_post(*args, **kwargs):
            replay_started.set()
            assert allow_replay.wait(timeout=2)
            return MagicMock()

        client.post.side_effect = blocked_post
        writer = LocalFallbackWriter(temp_fallback_dir)
        replay_thread = threading.Thread(target=writer.replay, args=(client,))
        replay_thread.start()
        assert replay_started.wait(timeout=2)

        write_thread = threading.Thread(
            target=writer.write,
            args=({"title": "new"},),
        )
        write_thread.start()
        allow_replay.set()
        replay_thread.join(timeout=2)
        write_thread.join(timeout=2)

        with open(date_file, encoding="utf-8") as f:
            entries = [json.loads(line) for line in f if line.strip()]
        assert [entry["title"] for entry in entries] == ["old", "new"]
        assert entries[0]["_replayed"] is True
        assert entries[1]["_replayed"] is False

    def test_concurrent_replays_submit_each_entry_once(self, temp_fallback_dir):
        date_file = os.path.join(temp_fallback_dir, "2026-07-16.jsonl")
        with open(date_file, "w", encoding="utf-8") as f:
            f.write(json.dumps({"title": "once", "_replayed": False}) + "\n")

        first_submit = threading.Event()
        allow_submit = threading.Event()
        client = MagicMock()

        def blocked_post(*args, **kwargs):
            first_submit.set()
            assert allow_submit.wait(timeout=2)
            return MagicMock()

        client.post.side_effect = blocked_post
        writer_a = LocalFallbackWriter(temp_fallback_dir)
        writer_b = LocalFallbackWriter(temp_fallback_dir)
        thread_a = threading.Thread(target=writer_a.replay, args=(client,))
        thread_b = threading.Thread(target=writer_b.replay, args=(client,))
        thread_a.start()
        assert first_submit.wait(timeout=2)
        thread_b.start()
        allow_submit.set()
        thread_a.join(timeout=2)
        thread_b.join(timeout=2)

        assert client.post.call_count == 1


# ---------------------------------------------------------------------------
# Class: TestFallbackDirConfigurable
# ---------------------------------------------------------------------------
class TestFallbackDirConfigurable:
    def test_constructor_arg_required(self):
        """fallback_dir is mandatory — no implicit ``~/.hermes`` default."""
        with pytest.raises(ValueError, match="explicit `fallback_dir`"):
            LocalFallbackWriter(fallback_dir="")

    def test_constructor_arg_overrides_default(self, temp_fallback_dir):
        writer = LocalFallbackWriter(fallback_dir=temp_fallback_dir)
        writer.write({"title": "routed"})
        assert len(
            [
                name for name in os.listdir(temp_fallback_dir)
                if name.endswith(".jsonl")
            ]
        ) == 1


# ---------------------------------------------------------------------------
# Class: TestFallbackLogWarning
# ---------------------------------------------------------------------------
class TestFallbackLogWarning:
    def test_log_warning_writes_to_stderr(self, capsys, temp_fallback_dir):
        writer = LocalFallbackWriter(fallback_dir=temp_fallback_dir)
        writer.log_warning("[lanonasis] test warning message")
        stderr = capsys.readouterr().err
        assert "test warning" in stderr


# ---------------------------------------------------------------------------
# Class: TestProviderUsesHermesHomeForFallback
# Contract: provider.initialize() routes fallback under hermes_home.
# ---------------------------------------------------------------------------
class TestProviderUsesHermesHomeForFallback:
    def test_provider_initialize_routes_fallback_under_hermes_home(
        self, tmp_path, monkeypatch
    ):
        """The provider MUST derive the fallback dir from the ``hermes_home``
        kwarg passed to ``initialize()`` — never from a hardcoded path.

        Live tests use ``tmp_path`` to avoid touching the real filesystem
        under ``~/.hermes``.
        """
        hermes_home = tmp_path / "my_lana_profile"
        hermes_home.mkdir()
        monkeypatch.setenv("LANONASIS_API_KEY", "test-key")

        with patch("hermes_lanonasis_memory.provider.LanOnasisClient") as MockClient:
            instance = MagicMock()
            instance.health_check.return_value = True
            instance.get_cached_user_id.return_value = "user-123"
            instance.get.return_value.status_code = 200
            instance.get.return_value.json.return_value = {"user_id": "user-123"}
            instance.post.return_value.status_code = 200
            instance.post.return_value.json.return_value = {"success": True}
            instance.delete.return_value.status_code = 200
            MockClient.return_value = instance

            from hermes_lanonasis_memory import LanonasisMemoryProvider
            p = LanonasisMemoryProvider()
            p.initialize(session_id="s-1", hermes_home=str(hermes_home))

            # Force the next API call to fail so a fallback write fires.
            p._client.post.side_effect = Exception("API down")
            p.sync_turn("u", "a")
            p.shutdown()

            expected_dir = hermes_home / "workspace" / "memory"
            assert expected_dir.is_dir(), (
                f"Fallback dir not created under hermes_home: {expected_dir}"
            )
            # And it must NOT be the legacy literal ``~/.hermes`` location.
            assert not (tmp_path / ".hermes").exists(), (
                "Fallback wrote into the wrong parent (created `.hermes` "
                "under tmp instead of routing through hermes_home)."
            )

    def test_provider_rejects_missing_hermes_home(self, monkeypatch):
        """No kwargs + no env var → RuntimeError, NOT a silent default to
        ``~/.hermes``. (Per the contract docs.)"""
        monkeypatch.delenv("HERMES_HOME", raising=False)
        from hermes_lanonasis_memory import LanonasisMemoryProvider
        p = LanonasisMemoryProvider()
        with pytest.raises(RuntimeError, match="hermes_home"):
            p.initialize(session_id="s-1")

    def test_provider_does_not_hardcode_user_home_in_live_paths(self):
        """Static check: live modules must not contain any ``expanduser(\"~/.hermes\")``
        in the executable source. ``initialize()`` derives paths from
        ``hermes_home`` instead."""
        import inspect
        from hermes_lanonasis_memory import provider, fallback as fb

        # Scan only the executable lines (strip docstrings + comments).
        def _executable(src: str) -> str:
            out: list[str] = []
            in_doc = False
            for line in src.splitlines():
                s = line.strip()
                if line.startswith(('"""', "'''")):
                    in_doc = not in_doc
                    continue
                if in_doc or s.startswith("#") or not s:
                    continue
                out.append(line)
            return "\n".join(out)

        provider_exec = _executable(inspect.getsource(provider))
        fallback_exec = _executable(inspect.getsource(fb))

        assert 'expanduser("~/.hermes")' not in provider_exec, (
            "provider.py must not hardcode ~/.hermes as a default path — "
            "derive paths from initialize(hermes_home=...)."
        )
        assert 'expanduser("~/.hermes")' not in fallback_exec, (
            "fallback.py must not hardcode ~/.hermes — callers must pass "
            "fallback_dir explicitly."
        )
        assert "FALLBACK_DIR = " not in fallback_exec, (
            "fallback.py must not assign a module-level FALLBACK_DIR "
            "constant at import time."
        )
