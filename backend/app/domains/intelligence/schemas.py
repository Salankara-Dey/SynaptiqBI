"""
Pydantic schemas for Phase 4 Intelligence API.
"""
import uuid
from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Insights ──────────────────────────────────────────────────────

class InsightRequest(BaseModel):
    max_insights: int = Field(default=5, ge=1, le=10, description="Maximum number of insights to generate")


class Insight(BaseModel):
    title: str
    description: str
    category: str = Field(description="One of: trend, anomaly, correlation, distribution, recommendation")
    confidence: float = Field(ge=0, le=1, description="Confidence score 0-1")
    affected_columns: list[str] = Field(default_factory=list)


class InsightResponse(BaseModel):
    dataset_id: uuid.UUID
    insights: list[Insight]
    summary: str
    token_usage: int = 0


# ── Natural Language Query ────────────────────────────────────────

class NLQueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)


class GeneratedQuery(BaseModel):
    query_type: str = Field(description="aggregate or chart")
    config: dict[str, Any]
    explanation: str


class NLQueryResponse(BaseModel):
    dataset_id: uuid.UUID
    question: str
    generated_query: GeneratedQuery
    result: dict[str, Any]


# ── Forecasting ──────────────────────────────────────────────────

class ForecastRequest(BaseModel):
    date_column: str
    value_column: str
    periods: int = Field(default=30, ge=1, le=365, description="Number of future periods to forecast")
    frequency: str = Field(default="D", description="Frequency: D (daily), W (weekly), M (monthly)")


class ForecastPoint(BaseModel):
    date: str
    value: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    dataset_id: uuid.UUID
    date_column: str
    value_column: str
    historical: list[dict[str, Any]]
    forecast: list[ForecastPoint]
    summary: str
