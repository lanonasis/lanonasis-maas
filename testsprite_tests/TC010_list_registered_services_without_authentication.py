import requests

def test_list_registered_services_without_authentication():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/v1/services"
    headers = {
        # Explicitly no auth headers to simulate no authentication
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Status code should be 200 as per requirements (no auth required) or potentially a service unavailable
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"

    # Content-Type should be application/json (typical for API)
    content_type = response.headers.get("Content-Type", "")
    assert "application/json" in content_type.lower(), f"Expected JSON response, got Content-Type: {content_type}"

    # Response body should be a JSON array or list of services (or possibly empty list)
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    # Verify data is list or dict (list of services or object with services list)
    assert isinstance(data, (list, dict)), f"Response JSON should be list or dict, got {type(data)}"

    # Security headers: check for common security headers presence (Helmet or similar)
    security_headers = [
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Strict-Transport-Security",
        "X-XSS-Protection",
        "Referrer-Policy",
        "Content-Security-Policy"
    ]
    # Check at least one security header is set
    security_headers_present = [h for h in security_headers if h in response.headers]
    assert security_headers_present, "No common security headers present in response"

test_list_registered_services_without_authentication()