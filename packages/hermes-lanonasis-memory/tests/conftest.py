"""pytest fixtures for hermes-lanonasis-memory tests."""

import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture(autouse=True)
def isolate_api_key_environment(monkeypatch):
    """Prevent developer-shell credentials from influencing test outcomes."""
    monkeypatch.delenv("LANONASIS_API_KEY", raising=False)


@pytest.fixture(autouse=True)
def reset_dedup_guard():
    """Reset the process-wide DedupGuard between tests.

    H2: ``DedupGuard`` is a module-level singleton so repeated tests in
    the same ``pytest`` process would otherwise see each other's prior
    writes. Each test starts with a clean dedup state.
    """
    from hermes_lanonasis_memory import scope
    scope.get_dedup_guard().reset()
    yield
    scope.get_dedup_guard().reset()


@pytest.fixture(autouse=True)
def isolate_hermes_opt_in_env(monkeypatch):
    """Make sure H2 opt-in env vars are absent unless a test sets them."""
    for key in (
        "LANONASIS_HERMES_REMOTE_RAW_TURNS",
        "LANONASIS_HERMES_REMOTE_SESSION_SUMMARY",
        "LANONASIS_HERMES_SCOPE_TYPE",
        "LANONASIS_HERMES_SCOPE_ID",
    ):
        monkeypatch.delenv(key, raising=False)


@pytest.fixture
def mock_httpx_client():
    """Return a MagicMock that behaves like an httpx.Client."""
    client = MagicMock()
    client.get.return_value.status_code = 200
    client.post.return_value.status_code = 200
    client.delete.return_value.status_code = 200
    return client


@pytest.fixture
def mock_config():
    """Return a minimal config object."""
    class Config:
        api_url = "https://api.lanonasis.com"
        api_key = "test_key_123"
        organization_id = None
        project_scope = None
        subject_id_strategy = "current_user"
        subject_id = None
        tool_policy = "read_only"
    return Config()


@pytest.fixture
def provider(mock_config, tmp_path):  # mock_httpx_client removed — provider fixture injects _client directly
    """Return an initialized LanonasisMemoryProvider with mocked deps.

    H2 isolation: every test gets a fresh ``hermes_home`` directory
    under ``tmp_path`` so the local FTS5 store starts empty and the
    fallback writer writes into a per-test sub-directory. Without
    this, prior tests' rows leak into later ones and the assertion
    that "this test wrote X" is no longer reliable.
    """
    hermes_home = tmp_path / "hermes-home"
    hermes_home.mkdir()
    with patch("hermes_lanonasis_memory.provider.LanOnasisClient") as MockClient:
        mock_instance = MagicMock()
        mock_instance.health_check.return_value = True
        mock_instance.get_cached_user_id.return_value = "user-123"
        mock_instance.get.return_value.status_code = 200
        mock_instance.get.return_value.json.return_value = {"user_id": "user-123"}
        mock_instance.post.return_value.status_code = 200
        mock_instance.post.return_value.json.return_value = {"success": True}
        mock_instance.delete.return_value.status_code = 200
        MockClient.return_value = mock_instance

        from hermes_lanonasis_memory import LanonasisMemoryProvider
        p = LanonasisMemoryProvider()
        p.initialize(session_id="test-session-001", hermes_home=str(hermes_home))
        # Overwrite the live config with our mock
        p._config = mock_config
        p._client = mock_instance
        p._fallback = MagicMock()
        p._session_id = "test-session-001"
        p._cached_user_id = "user-123"
        # _local_store is now initialised by initialize() above.
        return p
