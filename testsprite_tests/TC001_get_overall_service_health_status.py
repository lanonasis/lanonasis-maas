import requests

def test_get_overall_service_health_status():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/v1/health"
    headers = {
        "X-Project-Scope": "lanonasis-maas",
        "Authorization": "Bearer LOCAL_DEV_JWT_REDACTED"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    json_data = response.json()
    # Basic checks on the response content: keys that indicate overall service health and dependencies
    # Since the exact schema isn't given, check that keys commonly present in health responses are present.
    assert isinstance(json_data, dict), "Response JSON root should be a dictionary"
    # Example expected keys (typical health response):
    expected_keys = ["status", "dependencies", "uptime"]
    # We check presence of 'status' and 'dependencies' at minimum
    assert "status" in json_data, "Response JSON should contain 'status'"
    assert "dependencies" in json_data, "Response JSON should contain 'dependencies'"
    # Optionally check status value is a string e.g. "ok"
    assert isinstance(json_data["status"], str), "'status' should be a string"
    # dependencies should be a dict or list
    assert isinstance(json_data["dependencies"], (dict, list)), "'dependencies' should be a dict or list"

test_get_overall_service_health_status()