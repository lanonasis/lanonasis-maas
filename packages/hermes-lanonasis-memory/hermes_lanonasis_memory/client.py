"""httpx wrapper around LanOnasis MaaS API."""

from typing import Optional
import httpx


class LanOnasisClient:
    """Lightweight httpx client with error suppression."""

    def __init__(self, base_url: str, api_key: str, timeout: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Lanonasis-Client-Id": "hermes",
            },
            timeout=timeout,
        )

    def get(self, path: str, **kwargs) -> httpx.Response:
        return self._client.get(path, **kwargs)

    def post(self, path: str, **kwargs) -> httpx.Response:
        return self._client.post(path, **kwargs)

    def delete(self, path: str, **kwargs) -> httpx.Response:
        return self._client.delete(path, **kwargs)

    def close(self) -> None:
        self._client.close()

    def health_check(self) -> bool:
        """Return True if /api/v1/health returns 200."""
        try:
            resp = self.get("/api/v1/health", timeout=3.0)
            return resp.status_code == 200
        except Exception:
            return False

    def get_cached_user_id(self) -> Optional[str]:
        """Fetch current user ID for subject resolution."""
        try:
            resp = self.get("/api/v1/auth/me", timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("user_id") or data.get("id")
        except Exception:
            pass
        return None

    def flush_reasoning(self, subject_id: str) -> bool:
        """Call POST /api/v1/intelligence/flush. Returns True on success."""
        try:
            resp = self.post(
                "/api/v1/intelligence/flush",
                json={"subject_id": subject_id},
                timeout=30.0,
            )
            return resp.status_code in (200, 201, 202)
        except Exception:
            return False
