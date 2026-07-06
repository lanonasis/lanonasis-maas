import requests

BASE_URL = "http://localhost:3000"
ENDPOINT = "/api/v1/auth/basic/login"
HEADERS = {
    "X-Project-Scope": "lanonasis-maas"
}
TIMEOUT = 30

def test_basic_authentication_login_with_valid_credentials():
    url = BASE_URL + ENDPOINT
    payload = {
        "email": "testsprite@local.test",
        "password": "Password123!"
    }

    try:
        response = requests.post(url, headers=HEADERS, json=payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    assert "token" in data, "Response JSON missing 'token'"
    assert isinstance(data["token"], str) and len(data["token"]) > 0, "'token' should be a non-empty string"
    assert "user" in data, "Response JSON missing 'user' object"
    assert isinstance(data["user"], dict), "'user' should be a dictionary object"

    # Optionally validate user object fields
    user = data["user"]
    assert "email" in user and user["email"] == payload["email"], "User email mismatch or missing in response"

test_basic_authentication_login_with_valid_credentials()
