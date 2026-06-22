"""
Pydantic schemas for the Phase 3 Analytics API.

Request models define what the frontend sends; response models
define what comes back.  Every analytics endpoint operates on a
single dataset identified by its UUID in the URL path.
"""
import uuid
from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Shared filter spec ────────────────────────────────────────────
class FilterSpec(BaseModel):
    column: str
    operator: str = Field(
        ...,
        description="One of: eq, ne, gt, gte, lt, lte, contains, not_contains",
    )
    value: Any


# ── Aggregation ───────────────────────────────────────────────────
class MetricSpec(BaseModel):
    column: str
    function: str = Field(
        ...,
        description="One of: sum, mean, median, min, max, count, nunique",
    )


class AggregateRequest(BaseModel):
    group_by: list[str] = Field(default_factory=list)
    metrics: list[MetricSpec]
    filters: list[FilterSpec] = Field(default_factory=list)


class AggregateResponse(BaseModel):
    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int


# ── Chart data ────────────────────────────────────────────────────
class ChartRequest(BaseModel):
    chart_type: str = Field(
        ...,
        description="One of: bar, line, pie, scatter, histogram",
    )
    x_column: str
    y_column: str | None = None
    group_by: str | None = None
    filters: list[FilterSpec] = Field(default_factory=list)
    bins: int = Field(default=20, ge=2, le=100, description="Bins for histogram")


class ChartSeries(BaseModel):
    name: str
    data: list[Any]


class ChartResponse(BaseModel):
    chart_type: str
    labels: list[Any]
    series: list[ChartSeries]


# ── Correlation matrix ───────────────────────────────────────────
class CorrelationResponse(BaseModel):
    columns: list[str]
    matrix: list[list[float | None]]


# ── Summary statistics ───────────────────────────────────────────
class ColumnSummary(BaseModel):
    column: str
    dtype: str
    count: int
    null_count: int
    unique_count: int
    # Numeric-only fields
    mean: float | None = None
    std: float | None = None
    min: float | None = None
    max: float | None = None
    median: float | None = None
    p25: float | None = None
    p75: float | None = None
    skewness: float | None = None
    histogram: dict[str, Any] | None = None
    # Categorical-only fields
    top_values: dict[str, int] | None = None


class SummaryResponse(BaseModel):
    dataset_id: uuid.UUID
    row_count: int
    column_count: int
    numeric_columns: int
    categorical_columns: int
    columns: list[ColumnSummary]
