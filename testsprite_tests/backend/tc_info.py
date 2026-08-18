import os
import requests

TARGET_URL = os.environ.get("TARGET_URL", "https://api.lanonasis.com")


def test_info_endpoint_returns_service_metadata():
    r = requests.get(f"{TARGET_URL}/api/v1/info")
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body.get("service") == "Onasis-CORE"
    assert "capabilities" in body
    assert "endpoints" in body
