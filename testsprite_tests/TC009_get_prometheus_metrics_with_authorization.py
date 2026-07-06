import requests

def test_get_prometheus_metrics_with_authorization():
    base_url = "http://localhost:3000"
    endpoint = "/api/v1/metrics"
    url = base_url + endpoint

    headers = {
        "X-Project-Scope": "lanonasis-maas",
        "Authorization": (
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            "eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwYWEiLCJ1c2VyX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMGFhIiwib3JnYW5pemF0aW9uX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAxIiwiZW1haWwiOiJ0ZXN0c3ByaXRlQGxvY2FsLnRlc3QiLCJyb2xlIjoiYWRtaW4iLCJwbGFuIjoiZW50ZXJwcmlzZSIsImlhdCI6MTc4MTAyOTQwMSwiZXhwIjoxNzgxNjM0MjAxfQ."
            "58PJM2eItfRZnEPRpe0kGu2iR4Qw3nok2567FPMeyaA"
        )
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"
    content_type = response.headers.get("Content-Type", "")
    # Prometheus metrics usually have a content-type like text/plain; version=0.0.4
    assert "text/plain" in content_type, f"Expected 'text/plain' in Content-Type but got {content_type}"
    text = response.text
    assert text and "# HELP" in text and "# TYPE" in text, "Response body does not appear to contain Prometheus metrics format"

test_get_prometheus_metrics_with_authorization()