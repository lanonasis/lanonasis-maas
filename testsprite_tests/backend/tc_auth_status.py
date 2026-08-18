import os
import requests

TARGET_URL = os.environ.get("TARGET_URL", "https://api.lanonasis.com")


def test_auth_status_without_token_reports_unauthenticated():
    r = requests.get(f"{TARGET_URL}/api/v1/auth/status")
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body.get("authenticated") is False
    assert "identity" in body
