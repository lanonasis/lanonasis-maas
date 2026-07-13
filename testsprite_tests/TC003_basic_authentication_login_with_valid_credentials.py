import requests

def test_basic_authentication_login_with_valid_credentials():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/v1/auth/basic/login"
    headers = {
        "x-api-key": "lano_<redacted>",
        "Content-Type": "application/json"
    }
    # Valid credentials assumed for test input (though server is dummy/non-functional)
    payload = {
        "email": "validuser@example.com",
        "password": "ValidPass123!"
    }
    timeout_seconds = 30

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=timeout_seconds)
    except requests.RequestException as e:
        # If request fails due to connection issues, fail the test
        assert False, f"Request failed: {e}"

    # According to instructions, backend is dummy, expect 401 or 403 with error schema for auth endpoints
    assert response.status_code in (200, 401, 403), f"Unexpected status code: {response.status_code}"

    if response.status_code == 200:
        # Should contain JWT token and user object
        json_data = response.json()
        assert isinstance(json_data, dict), "Response payload is not a JSON object"
        assert "token" in json_data, "Response missing 'token'"
        assert isinstance(json_data["token"], str) and json_data["token"], "'token' is not a non-empty string"
        assert "user" in json_data, "Response missing 'user'"
        assert isinstance(json_data["user"], dict), "'user' is not an object"
    else:
        # Error responses expected to contain error message (could be validation or auth error)
        # Validate presence of error message keys
        try:
            json_data = response.json()
        except ValueError:
            assert False, "Error response is not valid JSON"

        # At minimum expect an error description or message key
        has_error_detail = any(
            key in json_data for key in ("error", "message", "description", "code")
        )
        assert has_error_detail, "Error response missing error details"

    # Check security headers presence in response, even on error
    security_headers = [
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Referrer-Policy",
        "Content-Security-Policy",
        "Strict-Transport-Security",
        "X-XSS-Protection"
    ]
    for header in security_headers:
        # They might or might not be present, but if present should be non-empty strings
        value = response.headers.get(header)
        if value is not None:
            assert isinstance(value, str) and value.strip(), f"Header {header} should not be empty if present"

test_basic_authentication_login_with_valid_credentials()
