import requests
import uuid

BASE_URL = "http://localhost:3000"
HEADERS = {
    "X-Project-Scope": "lanonasis-maas",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwYWEiLCJ1c2VyX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMGFhIiwib3JnYW5pemF0aW9uX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAxIiwiZW1haWwiOiJ0ZXN0c3ByaXRlQGxvY2FsLnRlc3QiLCJyb2xlIjoiYWRtaW4iLCJwbGFuIjoiZW50ZXJwcmlzZSIsImlhdCI6MTc4MTAyOTQwMSwiZXhwIjoxNzgxNjM0MjAxfQ.58PJM2eItfRZnEPRpe0kGu2iR4Qw3nok2567FPMeyaA"
}
TIMEOUT = 30

def test_create_api_key_with_valid_project_context():
    # Step 1: Create a new project (required for valid project association)
    project_payload = {
        "name": f"test_project_{uuid.uuid4().hex[:8]}"
    }
    project = None
    api_key = None
    try:
        project_response = requests.post(
            f"{BASE_URL}/api/v1/api-keys/projects",
            headers=HEADERS,
            json=project_payload,
            timeout=TIMEOUT
        )
        assert project_response.status_code == 201, f"Expected 201 for project creation, got {project_response.status_code}"
        project = project_response.json()
        assert "id" in project and isinstance(project["id"], str), "Project ID missing in response"

        # Step 2: Create an API key with valid project association
        api_key_payload = {
            "name": f"test_api_key_{uuid.uuid4().hex[:8]}",
            "project_id": project["id"]
        }

        api_key_response = requests.post(
            f"{BASE_URL}/api/v1/api-keys",
            headers=HEADERS,
            json=api_key_payload,
            timeout=TIMEOUT
        )
        assert api_key_response.status_code == 201, f"Expected 201 for API key creation, got {api_key_response.status_code}"
        api_key = api_key_response.json()
        # Validate returned API key details
        assert "id" in api_key and isinstance(api_key["id"], str), "API key id missing in response"
        assert "key" in api_key and isinstance(api_key["key"], str) and api_key["key"], "API key value missing or empty"
        assert "project_id" in api_key and api_key["project_id"] == project["id"], "Project association incorrect in API key response"
        assert "name" in api_key and api_key["name"] == api_key_payload["name"], "API key name incorrect"

    finally:
        # Cleanup: Delete created API key and project if they exist
        if api_key and "id" in api_key:
            try:
                del_api_key_resp = requests.delete(
                    f"{BASE_URL}/api/v1/api-keys/{api_key['id']}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
                # The delete might return 200 or 204
                assert del_api_key_resp.status_code in (200, 204), f"Failed to delete API key, status {del_api_key_resp.status_code}"
            except Exception:
                pass

        if project and "id" in project:
            try:
                del_project_resp = requests.delete(
                    f"{BASE_URL}/api/v1/api-keys/projects/{project['id']}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
                # Project delete might be supported, else ignore failure
                if del_project_resp.status_code not in (200, 204, 404):
                    # Accept 404 if project deletion endpoint might not exist or project already deleted
                    raise AssertionError(f"Unexpected status code deleting project: {del_project_resp.status_code}")
            except Exception:
                pass

test_create_api_key_with_valid_project_context()