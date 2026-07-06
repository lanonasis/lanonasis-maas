import requests

def test_list_registered_services_without_authentication():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/v1/services"
    headers = {
        "X-Project-Scope": "lanonasis-maas",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwYWEiLCJ1c2VyX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMGFhIiwib3JnYW5pemF0aW9uX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAxIiwiZW1haWwiOiJ0ZXN0c3ByaXRlQGxvY2FsLnRlc3QiLCJyb2xlIjoiYWRtaW4iLCJwbGFuIjoiZW50ZXJwcmlzZSIsImlhdCI6MTc4MTAyOTQwMSwiZXhwIjoxNzgxNjM0MjAxfQ.58PJM2eItfRZnEPRpe0kGu2iR4Qw3nok2567FPMeyaA"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
        data = response.json()
        assert isinstance(data, list) or (isinstance(data, dict) and "services" in data), "Expected response to be a list or dict containing 'services'"
        # If the response is dict with 'services' key, check it is a list
        if isinstance(data, dict) and "services" in data:
            assert isinstance(data["services"], list), "The 'services' key should contain a list"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_list_registered_services_without_authentication()