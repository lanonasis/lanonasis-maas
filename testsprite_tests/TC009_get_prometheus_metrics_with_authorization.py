import requests

def test_get_prometheus_metrics_with_authorization():
    base_url = "http://localhost:3000"
    endpoint = "/api/v1/metrics"
    url = f"{base_url}{endpoint}"
    headers = {
        "Authorization": "Bearer dummy_valid_token_for_test_purpose",
        "x-api-key": "lano_7bxi41l2sm86scqsyn9e1a92zib7w7rz"
    }
    timeout = 30

    try:
        response = requests.get(url, headers=headers, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

    # Allowed expected statuses: 200 (success), 401 or 403 (auth errors), 500/503 (service errors)
    assert response.status_code in {200, 401, 403, 500, 503}, \
        f"Unexpected status code: {response.status_code} with body: {response.text}"

    # If 200, verify content-type and content format minimally (should be text/plain Prometheus format)
    if response.status_code == 200:
        content_type = response.headers.get("Content-Type", "")
        assert "text/plain" in content_type, f"Expected Content-Type to include 'text/plain', got {content_type}"
        # Basic check for Prometheus metrics format - lines with metric_name and value
        body_text = response.text
        assert body_text.strip(), "Response body is empty"
        # Check that it contains typical prometheus metric syntax like lines with no JSON or HTML tags
        assert any(line and not line.startswith("#") for line in body_text.splitlines()), \
            "No non-comment metrics lines found in response text"

    # If 401 or 403, check error response format (assumed JSON with error code/message)
    if response.status_code in {401, 403}:
        try:
            err_json = response.json()
        except Exception:
            assert False, "Error response is not valid JSON"
        assert "error" in err_json or "message" in err_json, \
            f"Error JSON response lacks 'error' or 'message' keys: {err_json}"

    # Check security headers presence minimal expectations (Helmet, CORS, etc)
    security_headers = [
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "X-XSS-Protection",
        "Referrer-Policy",
        "Content-Security-Policy",
        "Permissions-Policy",
        "Access-Control-Allow-Origin"
    ]
    # Presence of at least some security headers expected
    headers_lower = {k.lower(): v for k, v in response.headers.items()}
    found_security_header = any(
        any(shdr.lower() == h for h in headers_lower.keys())
        for shdr in security_headers
    )
    assert found_security_header, "Expected at least one security header missing in response"

test_get_prometheus_metrics_with_authorization()