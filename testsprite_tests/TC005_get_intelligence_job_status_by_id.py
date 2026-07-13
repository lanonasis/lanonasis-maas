import requests

BASE_URL = "http://localhost:3000"
API_KEY = "lano_<redacted>"
HEADERS = {
    "x-api-key": API_KEY,
    "Authorization": "Bearer dummy_token"
}
TIMEOUT = 30

def test_get_intelligence_job_status_by_id():
    job_id = "test-job-id-123"  # Using a fixed dummy job id for the smoke test
    url = f"{BASE_URL}/api/v1/intelligence/jobs/{job_id}"
    try:
        response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    # According to instructions, the endpoint is auth protected and backed by a dummy DB,
    # so expect 401/403 (e.g., INVALID_PROJECT_SCOPE) or 5xx (503/500).
    assert response.status_code in {200, 401, 403, 500, 503}, f"Unexpected status code: {response.status_code}"
    # Validate presence and correctness of security headers where applicable
    # Common security headers to check if set:
    security_headers = [
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Strict-Transport-Security",
        "Content-Security-Policy",
        "X-XSS-Protection"
    ]
    for header in security_headers:
        # Header may or may not be present, so no hard assert, but check if present it's a string
        if header in response.headers:
            assert isinstance(response.headers[header], str), f"Security header {header} should be a string"

    if response.status_code == 200:
        # Expect JSON body with job status and progress details
        try:
            data = response.json()
        except ValueError:
            assert False, "Response is not valid JSON"
        # Basic validation of expected fields
        assert "status" in data, "Response JSON missing 'status'"
        assert "progress" in data, "Response JSON missing 'progress'"
        # Validate progress is a dict or number
        progress = data["progress"]
        assert isinstance(progress, (dict, int, float)), "'progress' field must be a dict or numeric"
    else:
        # For error responses, expect JSON with error code/message, especially for 403
        try:
            error_resp = response.json()
        except ValueError:
            error_resp = None
        if response.status_code == 403:
            # Must have JSON error response with code and message fields if present
            assert error_resp is not None, "Expected JSON error response for 403 auth failure"
            assert isinstance(error_resp, dict), "Error response should be a JSON object"
            if "code" in error_resp:
                assert isinstance(error_resp["code"], str), "Error response 'code' must be a string"
                # If code present, the test expects it to be 'INVALID_PROJECT_SCOPE'
                assert error_resp["code"] == "INVALID_PROJECT_SCOPE", "Expected error code 'INVALID_PROJECT_SCOPE' for 403"
            if "message" in error_resp:
                assert isinstance(error_resp["message"], str), "Error response 'message' must be a string"
        elif response.status_code == 401:
            # 401 may or may not include detailed JSON with code/message, just ensure JSON present if possible
            if error_resp is not None:
                assert isinstance(error_resp, dict), "401 error response should be JSON object if present"
        elif response.status_code in (500, 503):
            # May have some generic error info, no strict schema
            pass

test_get_intelligence_job_status_by_id()
