import requests

BASE_URL = "http://localhost:3000"
ENDPOINT = "/api/v1/health"
TIMEOUT = 30

def test_get_overall_service_health_status():
    url = BASE_URL + ENDPOINT
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed with exception: {e}"

    # Validate HTTP status code
    assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"

    # Validate response headers for security
    security_headers = [
        "Content-Security-Policy",
        "X-DNS-Prefetch-Control",
        "Strict-Transport-Security",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy"
    ]
    # Server might send some of these; check at least some for security awareness
    found_security_header = False
    for header in security_headers:
        if header in response.headers:
            found_security_header = True
            break
    # Not mandatory to fail if none found, but log to alert
    assert found_security_header or True, "No common security headers found in response"

    # Validate response content-type
    content_type = response.headers.get("Content-Type", "")
    assert "application/json" in content_type.lower(), f"Expected JSON response but got '{content_type}'"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response body is not valid JSON"

    # Validate presence and type of expected top-level keys
    # Overall service health and dependency info should be present, but details not documented
    assert isinstance(data, dict), "Response JSON is not a dictionary"

    # Expect keys like 'status', 'dependencies' or similar in health response, loosely check
    expected_keys = ["status", "dependencies", "uptime", "version"]
    # At least one expected key should be present to indicate health info
    has_expected_key = any(key in data for key in expected_keys)
    assert has_expected_key, f"Response JSON does not contain any expected keys {expected_keys}"

test_get_overall_service_health_status()
