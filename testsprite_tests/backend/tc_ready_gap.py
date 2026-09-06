import os
import requests

TARGET_URL = os.environ.get("TARGET_URL", "https://api.lanonasis.com")


def test_readiness_probe_is_not_exposed_in_production():
    r = requests.get(f"{TARGET_URL}/api/v1/health/ready")
    assert r.status_code == 404, (
        f"expected 404 (endpoint not registered), got {r.status_code}: {r.text}"
    )
