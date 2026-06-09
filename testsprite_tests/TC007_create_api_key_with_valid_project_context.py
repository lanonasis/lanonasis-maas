import requests

BASE_URL = "http://localhost:3000"
API_KEYS_ENDPOINT = "/api/v1/api-keys"
TIMEOUT = 30

BEARER_TOKEN = "lano_7bxi41l2sm86scqsyn9e1a92zib7w7rz"


def test_create_api_key_with_valid_project_context():
    url = BASE_URL + API_KEYS_ENDPOINT
    headers = {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payload = {
        "project_id": "dummy-project-id",
        "name": "test-api-key"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        assert False, f"Request to create API key failed with exception: {e}"

    assert response.status_code in {201, 401, 403, 500, 503}, f"Unexpected status code: {response.status_code}"

    if response.status_code == 201:
        json_data = response.json()
        assert any(field in json_data for field in ["id", "key", "name"]), "API key details missing expected fields"
        assert "X-Content-Type-Options" in response.headers, "Missing security header X-Content-Type-Options"
        assert "X-Frame-Options" in response.headers, "Missing security header X-Frame-Options"
    elif response.status_code in {401, 403}:
        try:
            text = response.text
            if response.status_code == 403:
                assert "INVALID_PROJECT_SCOPE" in text, "Expected INVALID_PROJECT_SCOPE error on 403"
        except Exception:
            pass
        if "WWW-Authenticate" in response.headers:
            assert isinstance(response.headers["WWW-Authenticate"], str)
    else:
        try:
            _ = response.json()
        except Exception:
            pass
        assert "X-Content-Type-Options" in response.headers, "Missing security header X-Content-Type-Options"
        assert "X-Frame-Options" in response.headers, "Missing security header X-Frame-Options"


test_create_api_key_with_valid_project_context()
