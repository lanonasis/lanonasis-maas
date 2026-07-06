import requests

BASE_URL = "http://localhost:3000"
SUBJECT_ID = "00000000-0000-4000-8000-000000000001"  # The org id in the token can be a subject id for test if appropriate

HEADERS = {
    "X-Project-Scope": "lanonasis-maas",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwYWEiLCJ1c2VyX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMGFhIiwib3JnYW5pemF0aW9uX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAxIiwiZW1haWwiOiJ0ZXN0c3ByaXRlQGxvY2FsLnRlc3QiLCJyb2xlIjoiYWRtaW4iLCJwbGFuIjoiZW50ZXJwcmlzZSIsImlhdCI6MTc4MTAyOTQwMSwiZXhwIjoxNzgxNjM0MjAxfQ.58PJM2eItfRZnEPRpe0kGu2iR4Qw3nok2567FPMeyaA"
}

def test_get_subject_profile_by_subject_id():
    url = f"{BASE_URL}/api/v1/profiles/{SUBJECT_ID}"
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    # Response should be JSON with current subject profile data
    try:
        profile_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Basic validations of profile_data: it should be a dict and contain keys expected in a profile
    assert isinstance(profile_data, dict), "Profile data should be a dictionary"

    assert "subject_id" in profile_data or "id" in profile_data or "subject" in profile_data, \
        "Profile data does not contain expected subject identifier key"

    # Additional possible keys to check (example, adapt as necessary)
    # Assert the returned subject_id matches the requested ID if present explicitly
    if "subject_id" in profile_data:
        assert profile_data["subject_id"].lower() == SUBJECT_ID.lower(), "Returned profile subject_id mismatch"
    elif "id" in profile_data:
        assert profile_data["id"].lower() == SUBJECT_ID.lower(), "Returned profile id mismatch"

test_get_subject_profile_by_subject_id()