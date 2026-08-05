"""Pydantic models for LanOnasis API request/response."""

from typing import Optional
from pydantic import BaseModel, Field


class MemorySearchRequest(BaseModel):
    query: str
    limit: int = Field(default=5, ge=1, le=100)
    memory_type: Optional[str] = None
    threshold: Optional[float] = Field(default=0.7, ge=0.0, le=1.0)


class MemoryStoreRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    memory_type: str = Field(default="context")
    organization_id: Optional[str] = None
    project_scope: Optional[str] = None
    tags: list[str] = Field(default_factory=list)


class MemoryGetRequest(BaseModel):
    id: str = Field(..., min_length=1)


class MemoryForgetRequest(BaseModel):
    id: str = Field(..., min_length=1)


class ConfigSchema(BaseModel):
    api_url: str
    api_key: str = Field(..., min_length=1)
    organization_id: Optional[str] = None
    project_scope: Optional[str] = None
    subject_id_strategy: str = Field(default="current_user")
    subject_id: Optional[str] = None


class ToolResult(BaseModel):
    """Result returned to Hermes after tool execution."""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    fallback: bool = False
