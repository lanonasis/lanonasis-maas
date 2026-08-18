import os
import requests

TARGET_URL = os.environ.get("TARGET_URL", "https://api.lanonasis.com")


def test_health_endpoint_returns_ok_with_dependencies():
    r = requests.get(f"{TARGET_URL}/api/v1/health")
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body.get("status") == "ok"
    assert "service" in body
    assert "dependencies" in body or "auth_service" in body or "api_service" in body
