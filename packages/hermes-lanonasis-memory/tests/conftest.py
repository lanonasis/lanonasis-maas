"""pytest fixtures for hermes-lanonasis-memory tests."""

import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture(autouse=True)
def isolate_api_key_environment(monkeypatch):
    """Prevent developer-shell credentials from influencing test outcomes."""
    monkeypatch.delenv("LANONASIS_API_KEY", raising=False)


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
def provider(mock_config):  # mock_httpx_client removed — provider fixture injects _client directly
    """Return an initialized LanonasisMemoryProvider with mocked deps."""
    # Patch where the symbol is looked up at runtime — the
    # ``provider`` module did ``from .client import LanOnasisClient``,
    # so it consults its own module attribute, not the client module's.
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
        p._config = mock_config
        p._client = mock_instance
        p._fallback = MagicMock()
        p._session_id = "test-session-001"
        p._cached_user_id = "user-123"
        p._hermes_home = "/tmp/hermes-test"
        return p
