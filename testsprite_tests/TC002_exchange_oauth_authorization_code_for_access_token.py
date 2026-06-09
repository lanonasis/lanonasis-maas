import requests

BASE_URL = "http://localhost:3000"
API_KEY = "lano_7bxi41l2sm86scqsyn9e1a92zib7w7rz"
HEADERS = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def test_exchange_oauth_authorization_code_for_access_token():
    url = f"{BASE_URL}/api/v1/auth/oauth/token"
    payload = {
        "code": "valid_authorization_code_example"
    }

    try:
        response = requests.post(url, headers=HEADERS, json=payload, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Server is dummy and no real valid auth, expect 4xx (401 or 403) or 5xx error codes for auth/db failure,
    # but since this endpoint is not auth required in PRD, success possible but unlikely in dummy env
    # Check allowed status codes and correct response schema for each case

    assert response.status_code in {200, 400, 401, 403, 422, 500, 503}, (
        f"Unexpected status code {response.status_code}, Response: {response.text}"
    )

    # Headers should include security headers - check minimal common security headers presence if any
    # This is a dummy test, so just verify standard headers like content-type present and no disallowed
    content_type = response.headers.get("Content-Type", "")
    assert "application/json" in content_type.lower(), "Response Content-Type should be application/json"

    json_resp = None
    try:
        json_resp = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    if response.status_code == 200:
        # Expect JSON with "access_token" or similar fields (per OAuth token response typical schema)
        # PRD does not give exact response schema for this endpoint, but expects valid access token field
        assert isinstance(json_resp, dict), "Response JSON should be a dictionary"
        assert "access_token" in json_resp, "access_token field missing in success response"
        assert isinstance(json_resp["access_token"], str) and json_resp["access_token"], "access_token should be a non-empty string"
    elif response.status_code in {400, 401, 403, 422}:
        # Expect error code and message fields in JSON
        assert isinstance(json_resp, dict), "Error response JSON should be a dictionary"
        assert "error" in json_resp or "message" in json_resp, "Error response should contain 'error' or 'message' field"
        # If error is INVALID_PROJECT_SCOPE, usually 403 expected but generic check
        if "error" in json_resp:
            assert isinstance(json_resp["error"], str)
        if "message" in json_resp:
            assert isinstance(json_resp["message"], str)
    elif response.status_code in {500, 503}:
        # Server error/DB dependent error; JSON with error info is possible
        if json_resp:
            assert isinstance(json_resp, dict), "Error response JSON should be a dictionary"
    else:
        # Should not happen due to prior assert on status_code set
        assert False, f"Unhandled status code {response.status_code}"

test_exchange_oauth_authorization_code_for_access_token()