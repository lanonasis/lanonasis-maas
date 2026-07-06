import requests

BASE_URL = "http://localhost:3000"
HEADERS = {
    "X-Project-Scope": "lanonasis-maas",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwYWEiLCJ1c2VyX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMGFhIiwib3JnYW5pemF0aW9uX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAxIiwiZW1haWwiOiJ0ZXN0c3ByaXRlQGxvY2FsLnRlc3QiLCJyb2xlIjoiYWRtaW4iLCJwbGFuIjoiZW50ZXJwcmlzZSIsImlhdCI6MTc4MTAyOTQwMSwiZXhwIjoxNzgxNjM0MjAxfQ.58PJM2eItfRZnEPRpe0kGu2iR4Qw3nok2567FPMeyaA"
}
TIMEOUT = 30

def test_get_intelligence_job_status_by_id():
    # Because no job id is provided, we create a new intelligence job resource to test against.
    # According to the PRD and instructions, intelligence jobs are async and behind /api/v1/intelligence/jobs/:id
    # The PRD does not specify a creation endpoint for jobs, so we will reuse a memory as a surrogate for a job or skip resource creation.
    # Since creating a job is not documented, we'll attempt to get a list of jobs by searching memories to pick a valid job id if possible.
    # Alternatively, we must fail the test in absence of a real job id.
    #
    # But since the PRD declares GET /api/v1/intelligence/jobs/:id with bearer token for an existing job returns 200,
    # and no POST creation endpoint for jobs is documented, we'll get a list of intelligence conclusions as a proxy and pick a known id.
    # If none exists, then we skip the test or raise an error.
    #
    # The test requires GET to /api/v1/intelligence/jobs/:id with valid job id returns 200 with job status and progress details.

    # Step 1: Try to get intelligence conclusions to find an existing job id (assuming some relation)
    try:
        resp = requests.get(
            f"{BASE_URL}/api/v1/intelligence/conclusions",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        conclusions_data = resp.json()
    except requests.RequestException as e:
        raise AssertionError(f"Failed to get intelligence conclusions for job id discovery: {e}")

    job_id = None
    # The PRD does not specify structure of conclusions but we expect an array with some job id or reference.
    # Attempt to extract one job id from conclusions if available:
    if isinstance(conclusions_data, dict):
        # Look for job references in the data if possible
        # Attempt keys commonly used
        for key in ["results", "conclusions", "items", "data"]:
            if key in conclusions_data and isinstance(conclusions_data[key], list) and len(conclusions_data[key]) > 0:
                # Try to find a job id within first item keys
                item = conclusions_data[key][0]
                if isinstance(item, dict):
                    for k in item.keys():
                        if "job" in k.lower() and isinstance(item[k], str) and item[k]:
                            job_id = item[k]
                            break
                    if job_id:
                        break
                if job_id:
                    break
        # If no standard key, fall back to first string id in top-level array
        if not job_id and isinstance(conclusions_data, list) and len(conclusions_data) > 0:
            first_item = conclusions_data[0]
            if isinstance(first_item, dict):
                for k in first_item.keys():
                    if "job" in k.lower() and isinstance(first_item[k], str) and first_item[k]:
                        job_id = first_item[k]
                        break
    # If still no job id found, fallback: try to find one intelligence job by other means or fail test.
    if not job_id:
        # There is no documented way to create or list jobs; fail with clear error
        raise AssertionError("No existing intelligence job id found to test GET /intelligence/jobs/:id")

    # Step 2: Call GET /api/v1/intelligence/jobs/:id with the found job id
    try:
        job_resp = requests.get(
            f"{BASE_URL}/api/v1/intelligence/jobs/{job_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        raise AssertionError(f"Request failed for GET /intelligence/jobs/{job_id}: {e}")

    # Step 3: Validate response status code and content
    assert job_resp.status_code == 200, f"Expected status 200 but got {job_resp.status_code}"
    try:
        job_data = job_resp.json()
    except ValueError:
        raise AssertionError("Response is not valid JSON")

    # Validate presence of job status and progress details fields (common key names)
    # Since no exact schema given, check for typical fields
    assert isinstance(job_data, dict), "Job data is not a JSON object"
    assert any(k in job_data for k in ("status", "jobStatus", "state")), "Job status field missing in response"
    assert any(k in job_data for k in ("progress", "progressDetails", "percentage")), "Job progress detail field missing in response"

test_get_intelligence_job_status_by_id()