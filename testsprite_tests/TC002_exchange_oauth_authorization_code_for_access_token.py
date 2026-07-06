import requests

def test_exchange_oauth_authorization_code_for_access_token():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/v1/auth/oauth/token"

    headers = {
        "X-Project-Scope": "lanonasis-maas"
    }

    # Use a valid authorization code for the test.
    # Since no specific code is provided, we attempt a dummy code "valid-auth-code".
    # The test expects a successful 200 response with a valid access token in the response body.
    payload = {
        "code": "valid-auth-code"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request to exchange code failed: {e}"

    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"

    try:
        json_resp = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Valid access token is expected in the response - typically as "access_token"
    assert "access_token" in json_resp, "access_token not found in response"

    # access_token should be a non-empty string
    access_token = json_resp["access_token"]
    assert isinstance(access_token, str) and access_token.strip(), "access_token is empty or not a string"


test_exchange_oauth_authorization_code_for_access_token()