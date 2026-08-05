import os
import requests

TARGET_URL = os.environ.get("TARGET_URL", "https://api.lanonasis.com")


def test_memory_endpoint_requires_authentication():
    r = requests.get(f"{TARGET_URL}/api/v1/memory")
    assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"
    body = r.json()
    assert "error" in body or "code" in body
    assert body.get("code") in (
        "AUTHENTICATION_ERROR",
        "AUTH_TOKEN_MISSING",
    ) or "Authentication" in body.get("error", "")
