import requests
import uuid

BASE_URL = "http://localhost:3000"
HEADERS = {
    "X-Project-Scope": "lanonasis-maas",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwYWEiLCJ1c2VyX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMGFhIiwib3JnYW5pemF0aW9uX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAxIiwiZW1haWwiOiJ0ZXN0c3ByaXRlQGxvY2FsLnRlc3QiLCJyb2xlIjoiYWRtaW4iLCJwbGFuIjoiZW50ZXJwcmlzZSIsImlhdCI6MTc4MTAyOTQwMSwiZXhwIjoxNzgxNjM0MjAxfQ.58PJM2eItfRZnEPRpe0kGu2iR4Qw3nok2567FPMeyaA"
}
TIMEOUT = 30

# Helper function to generate a valid UUID string
# Here just using uuid.uuid4() but can be replaced with a fixed UUID if required

def test_issue_proxy_token_for_mcp_session_key():
    # Step 1: Create an API Key Project
    project_payload = {
        "name": f"test-project-{uuid.uuid4().hex}",
        "description": "Test project for MCP session key proxy token issuance"
    }
    project_resp = requests.post(
        f"{BASE_URL}/api/v1/api-keys/projects",
        headers=HEADERS,
        json=project_payload,
        timeout=TIMEOUT
    )
    assert project_resp.status_code == 201, f"Project creation failed: {project_resp.text}"
    project_data = project_resp.json()
    project_id = project_data.get("id")
    assert project_id, "Created project missing id"

    # Step 2: Create an API Key associated to the project
    api_key_payload = {
        "name": f"test-key-{uuid.uuid4().hex}",
        "scopes": ["mcp:read", "mcp:write"],  # Assuming scopes need to include MCP access
        "projectId": project_id
    }
    api_key_resp = requests.post(
        f"{BASE_URL}/api/v1/api-keys",
        headers=HEADERS,
        json=api_key_payload,
        timeout=TIMEOUT
    )
    assert api_key_resp.status_code == 201, f"API key creation failed: {api_key_resp.text}"
    api_key_data = api_key_resp.json()
    api_key_id = api_key_data.get("id")
    api_key_name = api_key_data.get("name")
    assert api_key_id and api_key_name, "API key creation response missing id or name"

    # Step 3: Request MCP access for the API key to get sessionId
    mcp_request_payload = {
        "project_id": project_id,
        "api_key_id": api_key_id
    }
    mcp_access_resp = requests.post(
        f"{BASE_URL}/api/v1/mcp/api-keys/request-access",
        headers=HEADERS,
        json=mcp_request_payload,
        timeout=TIMEOUT
    )
    assert mcp_access_resp.status_code == 200, f"MCP access request failed: {mcp_access_resp.text}"
    mcp_access_data = mcp_access_resp.json()
    session_id = mcp_access_data.get("sessionId") or mcp_access_data.get("session_id") or mcp_access_data.get("id")
    assert session_id, "MCP access request response missing sessionId"

    # Step 4: Issue a proxy token for the named key in the session
    try:
        proxy_token_resp = requests.post(
            f"{BASE_URL}/api/v1/mcp/api-keys/sessions/{session_id}/keys/{api_key_name}/proxy-token",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert proxy_token_resp.status_code == 200, f"Issue proxy token failed: {proxy_token_resp.text}"
        proxy_token_data = proxy_token_resp.json()
        proxy_token = proxy_token_data.get("proxy_token") or proxy_token_data.get("token") or proxy_token_data.get("proxyToken")
        assert proxy_token and isinstance(proxy_token, str), "Proxy token missing or invalid in response"
    finally:
        # Cleanup: Delete the created API key and project regardless of test outcome
        if api_key_id:
            del_key_resp = requests.delete(
                f"{BASE_URL}/api/v1/api-keys/{api_key_id}",
                headers=HEADERS,
                timeout=TIMEOUT
            )
            # Allow 200 or 204 or 404 (already deleted) but assert docs say 200 confirming deletion
            assert del_key_resp.status_code in (200, 204, 404), f"API key deletion failed: {del_key_resp.text}"
        if project_id:
            del_proj_resp = requests.delete(
                f"{BASE_URL}/api/v1/api-keys/projects/{project_id}",
                headers=HEADERS,
                timeout=TIMEOUT
            )
            # Project deletion may or may not be supported; if supported verify success or 404
            assert del_proj_resp.status_code in (200, 204, 404), f"Project deletion failed: {del_proj_resp.text}"

test_issue_proxy_token_for_mcp_session_key()
