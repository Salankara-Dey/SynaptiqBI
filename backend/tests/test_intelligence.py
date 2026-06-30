"""
Unit tests for Phase 4 Intelligence service.

Tests rule-based insights, NL query config generation,
and forecast computation with synthetic data.
LLM calls are mocked.
"""
import uuid
from unittest.mock import AsyncMock, patch, MagicMock

import numpy as np
import pandas as pd
import pytest

from app.domains.intelligence.intelligence_service import (
    _rule_based_insights,
    _basic_forecast_summary,
    _profile_to_text,
    generate_insights,
    natural_language_query,
    generate_forecast,
)
from app.domains.intelligence.schemas import (
    Insight, InsightResponse, ForecastPoint,
    InsightRequest, NLQueryRequest, ForecastRequest,
)


# ── Fixtures ─────────────────────────────────────────────────────

DATASET_ID = uuid.uuid4()
OWNER_ID = uuid.uuid4()

SAMPLE_PROFILE = {
    "revenue": {
        "dtype": "float64",
        "null_count": 2,
        "unique_count": 95,
        "min": 10.0,
        "max": 50000.0,
        "mean": 5000.0,
        "std": 8000.0,
        "median": 2000.0,
    },
    "category": {
        "dtype": "object",
        "null_count": 0,
        "unique_count": 3,
        "top_values": {"Electronics": 60, "Clothing": 25, "Food": 15},
    },
    "quantity": {
        "dtype": "int64",
        "null_count": 0,
        "unique_count": 3,
        "min": 1,
        "max": 3,
        "mean": 2.0,
        "std": 0.8,
        "median": 2.0,
    },
}


def _make_mock_dataset(profile=None, status="ready"):
    """Create a mock Dataset object."""
    ds = MagicMock()
    ds.id = DATASET_ID
    ds.owner_id = OWNER_ID
    ds.name = "Test Dataset"
    ds.status = status
    ds.profile = profile if profile is not None else SAMPLE_PROFILE
    return ds


def _make_time_series_df():
    """Create a synthetic time-series DataFrame for forecast tests."""
    dates = pd.date_range("2024-01-01", periods=60, freq="D")
    values = 100 + np.arange(60) * 0.5 + np.random.normal(0, 5, 60)
    return pd.DataFrame({"date": dates, "value": values})


# ── Profile to text ──────────────────────────────────────────────

def test_profile_to_text():
    text = _profile_to_text(SAMPLE_PROFILE)
    assert "revenue" in text
    assert "category" in text
    assert "mean=" in text
    assert "top_values" in text


def test_profile_to_text_empty():
    assert _profile_to_text({}) == ""


# ── Rule-based insights ─────────────────────────────────────────

def test_rule_based_insights_generates_insights():
    result = _rule_based_insights(DATASET_ID, SAMPLE_PROFILE, max_insights=10)
    assert isinstance(result, InsightResponse)
    assert result.dataset_id == DATASET_ID
    assert len(result.insights) > 0
    assert result.token_usage == 0


def test_rule_based_high_variability():
    """Revenue has CV = 8000/5000 = 1.6 — should trigger high variability."""
    result = _rule_based_insights(DATASET_ID, SAMPLE_PROFILE, max_insights=10)
    titles = [i.title for i in result.insights]
    assert any("variability" in t.lower() or "revenue" in t.lower() for t in titles)


def test_rule_based_skewed_distribution():
    """Revenue mean=5000, median=2000, range=49990 — should detect skew."""
    result = _rule_based_insights(DATASET_ID, SAMPLE_PROFILE, max_insights=10)
    categories = [i.category for i in result.insights]
    assert "distribution" in categories or "anomaly" in categories


def test_rule_based_dominant_category():
    """Electronics = 60% — should trigger dominant category."""
    result = _rule_based_insights(DATASET_ID, SAMPLE_PROFILE, max_insights=10)
    descriptions = " ".join(i.description for i in result.insights)
    assert "Electronics" in descriptions or "dominant" in descriptions.lower()


def test_rule_based_low_cardinality():
    """Quantity has only 3 unique values — should detect low cardinality."""
    result = _rule_based_insights(DATASET_ID, SAMPLE_PROFILE, max_insights=10)
    titles = [i.title.lower() for i in result.insights]
    assert any("cardinality" in t or "quantity" in t for t in titles)


def test_rule_based_max_insights():
    """Should respect max_insights limit."""
    result = _rule_based_insights(DATASET_ID, SAMPLE_PROFILE, max_insights=2)
    assert len(result.insights) <= 2


def test_rule_based_empty_profile():
    """Empty profile should produce empty insights."""
    result = _rule_based_insights(DATASET_ID, {}, max_insights=5)
    assert len(result.insights) == 0


def test_rule_based_insight_structure():
    """Each insight should have required fields."""
    result = _rule_based_insights(DATASET_ID, SAMPLE_PROFILE, max_insights=10)
    for insight in result.insights:
        assert insight.title
        assert insight.description
        assert insight.category in ("trend", "anomaly", "correlation", "distribution", "recommendation")
        assert 0 <= insight.confidence <= 1
        assert isinstance(insight.affected_columns, list)


def test_rule_based_insights_sorted_by_confidence():
    """Insights should be sorted by confidence descending."""
    result = _rule_based_insights(DATASET_ID, SAMPLE_PROFILE, max_insights=10)
    if len(result.insights) > 1:
        for i in range(len(result.insights) - 1):
            assert result.insights[i].confidence >= result.insights[i + 1].confidence


def test_rule_based_missing_values_detection():
    """Revenue has null_count=2 — should detect missing values."""
    result = _rule_based_insights(DATASET_ID, SAMPLE_PROFILE, max_insights=10)
    titles = [i.title.lower() for i in result.insights]
    assert any("missing" in t or "null" in t or "revenue" in t for t in titles)


# ── Forecast summary ────────────────────────────────────────────

def test_basic_forecast_summary_upward():
    historical = [{"date": "2024-01-01", "value": 100.0}]
    forecast = [
        ForecastPoint(date="2024-02-01", value=110.0, lower_bound=100.0, upper_bound=120.0),
        ForecastPoint(date="2024-03-01", value=120.0, lower_bound=105.0, upper_bound=135.0),
    ]
    summary = _basic_forecast_summary(historical, forecast, "sales")
    assert "upward" in summary.lower()
    assert "sales" in summary.lower()


def test_basic_forecast_summary_downward():
    historical = [{"date": "2024-01-01", "value": 100.0}]
    forecast = [
        ForecastPoint(date="2024-02-01", value=90.0, lower_bound=80.0, upper_bound=100.0),
        ForecastPoint(date="2024-03-01", value=80.0, lower_bound=65.0, upper_bound=95.0),
    ]
    summary = _basic_forecast_summary(historical, forecast, "revenue")
    assert "downward" in summary.lower()


def test_basic_forecast_summary_stable():
    historical = [{"date": "2024-01-01", "value": 100.0}]
    forecast = [
        ForecastPoint(date="2024-02-01", value=100.0, lower_bound=90.0, upper_bound=110.0),
    ]
    summary = _basic_forecast_summary(historical, forecast, "units")
    assert "stable" in summary.lower()


def test_basic_forecast_summary_includes_count():
    historical = [{"date": "2024-01-01", "value": 50.0}]
    forecast = [
        ForecastPoint(date="2024-02-01", value=60.0, lower_bound=50.0, upper_bound=70.0),
        ForecastPoint(date="2024-03-01", value=70.0, lower_bound=55.0, upper_bound=85.0),
        ForecastPoint(date="2024-04-01", value=80.0, lower_bound=60.0, upper_bound=100.0),
    ]
    summary = _basic_forecast_summary(historical, forecast, "metric")
    assert "3" in summary  # 3 forecast periods
    assert "1" in summary  # 1 historical point


# ── Schema validation ───────────────────────────────────────────

def test_insight_schema_validation():
    insight = Insight(
        title="Test",
        description="Test description",
        category="trend",
        confidence=0.85,
        affected_columns=["col1"],
    )
    assert insight.title == "Test"
    assert insight.confidence == 0.85


def test_insight_schema_invalid_confidence():
    with pytest.raises(Exception):
        Insight(
            title="Test",
            description="Test description",
            category="trend",
            confidence=1.5,  # Out of range
            affected_columns=[],
        )


def test_insight_schema_negative_confidence():
    with pytest.raises(Exception):
        Insight(
            title="Test",
            description="Test description",
            category="trend",
            confidence=-0.1,  # Negative
            affected_columns=[],
        )


def test_forecast_point_schema():
    fp = ForecastPoint(
        date="2024-01-01",
        value=100.0,
        lower_bound=90.0,
        upper_bound=110.0,
    )
    assert fp.value == 100.0
    assert fp.lower_bound < fp.upper_bound


def test_insight_request_defaults():
    req = InsightRequest()
    assert req.max_insights == 5


def test_insight_request_validation():
    with pytest.raises(Exception):
        InsightRequest(max_insights=0)  # ge=1 constraint
    with pytest.raises(Exception):
        InsightRequest(max_insights=20)  # le=10 constraint


def test_nl_query_request_validation():
    req = NLQueryRequest(question="What is the average?")
    assert req.question == "What is the average?"
    with pytest.raises(Exception):
        NLQueryRequest(question="ab")  # min_length=3


def test_forecast_request_defaults():
    req = ForecastRequest(date_column="date", value_column="value")
    assert req.periods == 30
    assert req.frequency == "D"


def test_forecast_request_validation():
    with pytest.raises(Exception):
        ForecastRequest(date_column="d", value_column="v", periods=0)
    with pytest.raises(Exception):
        ForecastRequest(date_column="d", value_column="v", periods=500)


# ── Integration: generate_insights with mocked DB ────────────────

@pytest.mark.asyncio
async def test_generate_insights_rule_based():
    """Test full generate_insights flow with rule-based fallback (no API key)."""
    mock_ds = _make_mock_dataset()
    mock_db = AsyncMock()
    mock_db.scalar = AsyncMock(return_value=mock_ds)

    with patch("app.domains.intelligence.intelligence_service.is_ai_available", return_value=False):
        result = await generate_insights(DATASET_ID, OWNER_ID, mock_db, max_insights=5)

    assert isinstance(result, InsightResponse)
    assert result.dataset_id == DATASET_ID
    assert len(result.insights) > 0
    assert result.token_usage == 0
    assert "rule-based" in result.summary.lower() or "rule" in result.summary.lower()


@pytest.mark.asyncio
async def test_generate_insights_empty_profile():
    """Should raise 400 when profile is empty."""
    mock_ds = _make_mock_dataset(profile={})
    mock_db = AsyncMock()
    mock_db.scalar = AsyncMock(return_value=mock_ds)

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await generate_insights(DATASET_ID, OWNER_ID, mock_db)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_generate_insights_dataset_not_found():
    """Should raise 404 when dataset does not exist."""
    mock_db = AsyncMock()
    mock_db.scalar = AsyncMock(return_value=None)

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await generate_insights(DATASET_ID, OWNER_ID, mock_db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_generate_insights_dataset_not_ready():
    """Should raise 409 when dataset status is not 'ready'."""
    mock_ds = _make_mock_dataset(status="running")
    mock_db = AsyncMock()
    mock_db.scalar = AsyncMock(return_value=mock_ds)

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await generate_insights(DATASET_ID, OWNER_ID, mock_db)
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_generate_insights_with_llm():
    """Test generate_insights when LLM is available (mocked)."""
    mock_ds = _make_mock_dataset()
    mock_db = AsyncMock()
    mock_db.scalar = AsyncMock(return_value=mock_ds)

    llm_response = {
        "insights": [
            {
                "title": "Revenue Outlier Detected",
                "description": "The max revenue is 10x the median.",
                "category": "anomaly",
                "confidence": 0.92,
                "affected_columns": ["revenue"],
            }
        ],
        "summary": "Dataset shows high variance in revenue.",
    }

    with patch("app.domains.intelligence.intelligence_service.is_ai_available", return_value=True), \
         patch("app.domains.intelligence.intelligence_service.generate_json_completion", new_callable=AsyncMock, return_value=llm_response):
        result = await generate_insights(DATASET_ID, OWNER_ID, mock_db, max_insights=5)

    assert isinstance(result, InsightResponse)
    assert len(result.insights) == 1
    assert result.insights[0].title == "Revenue Outlier Detected"
    assert result.insights[0].category == "anomaly"


# ── Integration: natural_language_query with mocked DB/LLM ───────

@pytest.mark.asyncio
async def test_nl_query_requires_api_key():
    """Should raise 503 when OPENAI_API_KEY is not set."""
    mock_db = AsyncMock()

    from fastapi import HTTPException
    with patch("app.domains.intelligence.intelligence_service.is_ai_available", return_value=False), \
         pytest.raises(HTTPException) as exc_info:
        await natural_language_query(DATASET_ID, OWNER_ID, mock_db, "test question")
    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_nl_query_aggregate():
    """Test NL query that generates an aggregate query."""
    mock_ds = _make_mock_dataset()
    mock_db = AsyncMock()
    mock_db.scalar = AsyncMock(return_value=mock_ds)

    # Build a test DataFrame
    test_df = pd.DataFrame({
        "category": ["A", "B", "A", "B"],
        "revenue": [100, 200, 150, 250],
    })

    llm_response = {
        "query_type": "aggregate",
        "config": {
            "group_by": ["category"],
            "metrics": [{"column": "revenue", "function": "sum"}],
        },
        "explanation": "Sum of revenue grouped by category",
    }

    with patch("app.domains.intelligence.intelligence_service.is_ai_available", return_value=True), \
         patch("app.domains.intelligence.intelligence_service.generate_json_completion", new_callable=AsyncMock, return_value=llm_response), \
         patch("app.domains.intelligence.intelligence_service._load_dataframe", new_callable=AsyncMock, return_value=test_df):
        result = await natural_language_query(DATASET_ID, OWNER_ID, mock_db, "total revenue by category")

    assert result.dataset_id == DATASET_ID
    assert result.question == "total revenue by category"
    assert result.generated_query.query_type == "aggregate"
    assert "rows" in result.result


@pytest.mark.asyncio
async def test_nl_query_chart():
    """Test NL query that generates a chart query."""
    mock_ds = _make_mock_dataset()
    mock_db = AsyncMock()
    mock_db.scalar = AsyncMock(return_value=mock_ds)

    test_df = pd.DataFrame({
        "category": ["A", "B", "C", "D"],
        "revenue": [100, 200, 150, 250],
    })

    llm_response = {
        "query_type": "chart",
        "config": {
            "chart_type": "bar",
            "x_column": "category",
            "y_column": "revenue",
        },
        "explanation": "Bar chart of revenue by category",
    }

    with patch("app.domains.intelligence.intelligence_service.is_ai_available", return_value=True), \
         patch("app.domains.intelligence.intelligence_service.generate_json_completion", new_callable=AsyncMock, return_value=llm_response), \
         patch("app.domains.intelligence.intelligence_service._load_dataframe", new_callable=AsyncMock, return_value=test_df):
        result = await natural_language_query(DATASET_ID, OWNER_ID, mock_db, "show revenue by category")

    assert result.generated_query.query_type == "chart"
    assert "labels" in result.result
    assert "series" in result.result


# ── Integration: generate_forecast with mocked DB ────────────────

@pytest.mark.asyncio
async def test_generate_forecast_basic():
    """Test forecast with a valid time-series DataFrame."""
    ts_df = _make_time_series_df()

    with patch("app.domains.intelligence.intelligence_service._load_dataframe", new_callable=AsyncMock, return_value=ts_df), \
         patch("app.domains.intelligence.intelligence_service.is_ai_available", return_value=False):
        result = await generate_forecast(
            DATASET_ID, OWNER_ID, AsyncMock(), "date", "value", periods=7, frequency="D",
        )

    assert result.dataset_id == DATASET_ID
    assert result.date_column == "date"
    assert result.value_column == "value"
    assert len(result.historical) > 0
    assert len(result.forecast) == 7
    # Each forecast point has confidence interval
    for fp in result.forecast:
        assert fp.lower_bound <= fp.value <= fp.upper_bound


@pytest.mark.asyncio
async def test_generate_forecast_weekly():
    """Test forecast with weekly frequency."""
    ts_df = _make_time_series_df()

    with patch("app.domains.intelligence.intelligence_service._load_dataframe", new_callable=AsyncMock, return_value=ts_df), \
         patch("app.domains.intelligence.intelligence_service.is_ai_available", return_value=False):
        result = await generate_forecast(
            DATASET_ID, OWNER_ID, AsyncMock(), "date", "value", periods=4, frequency="W",
        )

    assert len(result.forecast) == 4


@pytest.mark.asyncio
async def test_generate_forecast_missing_column():
    """Should raise 400 for nonexistent column."""
    ts_df = _make_time_series_df()

    from fastapi import HTTPException
    with patch("app.domains.intelligence.intelligence_service._load_dataframe", new_callable=AsyncMock, return_value=ts_df), \
         pytest.raises(HTTPException) as exc_info:
        await generate_forecast(
            DATASET_ID, OWNER_ID, AsyncMock(), "nonexistent", "value", periods=7,
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_generate_forecast_too_few_points():
    """Should raise 400 when there aren't enough data points."""
    ts_df = pd.DataFrame({
        "date": pd.to_datetime(["2024-01-01", "2024-01-02"]),
        "value": [10.0, 20.0],
    })

    from fastapi import HTTPException
    with patch("app.domains.intelligence.intelligence_service._load_dataframe", new_callable=AsyncMock, return_value=ts_df), \
         pytest.raises(HTTPException) as exc_info:
        await generate_forecast(
            DATASET_ID, OWNER_ID, AsyncMock(), "date", "value", periods=7,
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_generate_forecast_with_llm_narrative():
    """Test that LLM narrative is used when available."""
    ts_df = _make_time_series_df()

    with patch("app.domains.intelligence.intelligence_service._load_dataframe", new_callable=AsyncMock, return_value=ts_df), \
         patch("app.domains.intelligence.intelligence_service.is_ai_available", return_value=True), \
         patch("app.domains.intelligence.intelligence_service.generate_completion", new_callable=AsyncMock, return_value="AI says: upward trend expected."):
        result = await generate_forecast(
            DATASET_ID, OWNER_ID, AsyncMock(), "date", "value", periods=7, frequency="D",
        )

    assert "AI says" in result.summary
