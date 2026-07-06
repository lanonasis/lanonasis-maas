import requests
import uuid

BASE_URL = "http://localhost:3000"
HEADERS = {
    "X-Project-Scope": "lanonasis-maas",
    "Authorization": "Bearer LOCAL_DEV_JWT_REDACTED"
}
TIMEOUT = 30

def test_create_memory_with_valid_data():
    url = f"{BASE_URL}/api/v1/memories"
    unique_id = str(uuid.uuid4())
    payload = {
        "title": f"Test Memory Title {unique_id}",
        "content": f"This is the content for test memory {unique_id}.",
        "memory_type": "personal"
    }

    response = None
    memory_id = None
    try:
        response = requests.post(url, headers=HEADERS, json=payload, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected status code 201, got {response.status_code}"
        data = response.json()
        assert "id" in data and isinstance(data["id"], str) and data["id"], "Response missing valid 'id'"
        assert data.get("title") == payload["title"], "Title in response does not match request"
        assert data.get("content") == payload["content"], "Content in response does not match request"
        assert data.get("memory_type") == payload["memory_type"], "Memory type in response does not match request"
        assert "organization_id" in data and isinstance(data["organization_id"], str) and data["organization_id"], "Response missing valid 'organization_id'"
        memory_id = data["id"]
    finally:
        if memory_id:
            # Cleanup the created memory after test
            delete_url = f"{BASE_URL}/api/v1/memories/{memory_id}"
            try:
                del_resp = requests.delete(delete_url, headers=HEADERS, timeout=TIMEOUT)
                assert del_resp.status_code in (200, 204), f"Failed to delete test memory {memory_id}, got status {del_resp.status_code}"
            except Exception as e:
                # Log the deletion error but do not raise
                print(f"Warning: could not delete test memory {memory_id}: {e}")

test_create_memory_with_valid_data()