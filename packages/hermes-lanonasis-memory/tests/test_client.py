"""Contract tests for the LanOnasis HTTP client."""

from unittest.mock import patch

from hermes_lanonasis_memory.client import LanOnasisClient


def test_client_identifies_requests_as_hermes():
    with patch("hermes_lanonasis_memory.client.httpx.Client") as client_factory:
        LanOnasisClient(
            base_url="https://api.lanonasis.com",
            api_key="test-key",
        )

    headers = client_factory.call_args.kwargs["headers"]
    assert headers["X-Lanonasis-Client-Id"] == "hermes"
    assert headers["Authorization"] == "Bearer test-key"
