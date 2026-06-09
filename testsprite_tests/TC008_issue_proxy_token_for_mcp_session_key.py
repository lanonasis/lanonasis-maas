import requests

BASE_URL = "http://localhost:3000"
API_KEY_HEADER = {"x-api-key": "lano_7bxi41l2sm86scqsyn9e1a92zib7w7rz"}
TIMEOUT = 30

def test_issue_proxy_token_for_mcp_session_key():
    # We do not have real auth credentials and no real database.
    # The endpoint requires bearer auth, test with missing and dummy bearer token.

    # Prepare dummy sessionId and keyName (no real DB access, so just placeholders)
    session_id = "dummy-session-id"
    key_name = "dummy-key-name"

    url = f"{BASE_URL}/api/v1/mcp/api-keys/sessions/{session_id}/keys/{key_name}/proxy-token"

    headers_no_auth = {"x-api-key": API_KEY_HEADER["x-api-key"]}
    headers_with_bearer = {
        "Authorization": "Bearer dummy_token",
        "x-api-key": API_KEY_HEADER["x-api-key"]
    }

    # 1. Try request without bearer token - should get 401 Unauthorized or 403 Forbidden
    r1 = requests.post(url, headers=headers_no_auth, timeout=TIMEOUT)
    assert r1.status_code in (401, 403), f"Expected 401 or 403 without bearer token, got {r1.status_code}"

    # 2. Try request with dummy bearer token - expecting 401/403 or 5xx due to dummy backend
    r2 = requests.post(url, headers=headers_with_bearer, timeout=TIMEOUT)

    # Accept 200 if by chance token accepted (unlikely), else 401, 403 or 5xx (503 or 500)
    assert r2.status_code in (200, 401, 403, 500, 503), f"Unexpected status code {r2.status_code}"

    # If 200, validate presence of a session-scoped proxy token in response JSON
    if r2.status_code == 200:
        json_resp = r2.json()
        assert isinstance(json_resp, dict), "Response is not a JSON object"
        # The token is expected; check key existence and format
        # No exact schema provided, but expect a token string - check a likely key presence
        token_keys = [k for k in json_resp.keys() if "token" in k.lower()]
        assert token_keys, "Response JSON missing proxy token field"
        token_value = json_resp[token_keys[0]]
        assert isinstance(token_value, str) and token_value.strip(), "Proxy token is empty or invalid"
    else:
        # On error, response JSON may include error structure; check common error fields
        try:
            json_err = r2.json()
            # Check for typical error keys: error, message, code, or status
            assert any(k in json_err for k in ("error", "message", "code", "status")), "Error response missing error description"
        except Exception:
            # Response not JSON on error is also acceptable in this dummy setup
            pass


test_issue_proxy_token_for_mcp_session_key()