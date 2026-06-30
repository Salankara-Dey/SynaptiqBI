"""
Intelligence service — Phase 4 AI Engine.

Three capabilities:
  1. generate_insights  – LLM-powered data insights (with rule-based fallback)
  2. natural_language_query – NL → analytics API config → execute
  3. generate_forecast  – statsmodels Holt-Winters + optional LLM narrative
"""
import uuid
import json
import logging
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.db.models.dataset import Dataset
from app.domains.intelligence.llm_client import (
    is_ai_available,
    generate_json_completion,
    generate_completion,
    estimate_tokens,
)
from app.domains.intelligence.schemas import (
    Insight, InsightResponse,
    GeneratedQuery, NLQueryResponse,
    ForecastPoint, ForecastResponse,
)
from app.domains.analytics.analytics_service import (
    _load_dataframe,
    compute_aggregation,
    compute_chart_data,
)
from app.domains.analytics.schemas import MetricSpec

logger = logging.getLogger(__name__)


# ── Helpers ──────────────────────────────────────────────────────

async def _get_dataset(
    dataset_id: uuid.UUID, owner_id: uuid.UUID, db: AsyncSession,
) -> Dataset:
    """Fetch and validate a dataset belongs to the user and is ready."""
    ds = await db.scalar(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == owner_id)
    )
    if not ds:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    if ds.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Dataset is not ready (status: {ds.status})",
        )
    return ds


def _profile_to_text(profile: dict) -> str:
    """Convert a profile dict into a concise text summary for LLM context."""
    lines = []
    for col, info in profile.items():
        dtype = info.get("dtype", "unknown")
        parts = [f"  {col} ({dtype})"]
        if "mean" in info and info["mean"] is not None:
            parts.append(f"mean={info['mean']}, std={info.get('std')}, min={info.get('min')}, max={info.get('max')}, median={info.get('median')}")
        if "top_values" in info:
            top = info["top_values"]
            parts.append(f"top_values={json.dumps(top)}")
        parts.append(f"nulls={info.get('null_count', 0)}, unique={info.get('unique_count', 0)}")
        lines.append(", ".join(parts))
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════
# 1. INSIGHTS
# ═══════════════════════════════════════════════════════════════════

async def generate_insights(
    dataset_id: uuid.UUID,
    owner_id: uuid.UUID,
    db: AsyncSession,
    max_insights: int = 5,
) -> InsightResponse:
    """
    Generate AI-powered insights from the dataset profile.
    Falls back to rule-based insights when OpenAI key is not configured.
    """
    ds = await _get_dataset(dataset_id, owner_id, db)
    profile = ds.profile or {}

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset profile not available. Re-process the dataset.",
        )

    if is_ai_available():
        return await _llm_insights(dataset_id, profile, ds.name, max_insights)
    else:
        return _rule_based_insights(dataset_id, profile, max_insights)


async def _llm_insights(
    dataset_id: uuid.UUID, profile: dict, dataset_name: str, max_insights: int,
) -> InsightResponse:
    """Use LLM to generate narrative insights."""
    profile_text = _profile_to_text(profile)
    token_est = estimate_tokens(profile_text)

    system_prompt = """You are a senior data analyst. Analyze the dataset profile below and produce actionable business insights.
Return a JSON object with this exact structure:
{
  "insights": [
    {
      "title": "short title",
      "description": "detailed explanation with specific numbers",
      "category": "one of: trend, anomaly, correlation, distribution, recommendation",
      "confidence": 0.0 to 1.0,
      "affected_columns": ["col1", "col2"]
    }
  ],
  "summary": "2-3 sentence executive summary of the dataset"
}
Focus on: outliers, skewed distributions, potential correlations between columns, data quality issues, and actionable recommendations.
Return ONLY valid JSON, no markdown."""

    user_prompt = f"""Dataset: {dataset_name}
Columns and statistics:
{profile_text}

Generate up to {max_insights} insights."""

    try:
        result = await generate_json_completion(system_prompt, user_prompt, temperature=0.3, max_tokens=2000)

        if "error" in result:
            logger.warning("LLM returned unparseable response, falling back to rules")
            return _rule_based_insights(dataset_id, profile, max_insights)

        insights = []
        for item in result.get("insights", [])[:max_insights]:
            try:
                insights.append(Insight(**item))
            except Exception:
                continue

        return InsightResponse(
            dataset_id=dataset_id,
            insights=insights,
            summary=result.get("summary", "AI-generated insights from your dataset."),
            token_usage=token_est,
        )
    except Exception as e:
        logger.error(f"LLM insight generation failed: {e}")
        return _rule_based_insights(dataset_id, profile, max_insights)


def _rule_based_insights(
    dataset_id: uuid.UUID, profile: dict, max_insights: int,
) -> InsightResponse:
    """Generate insights using statistical rules when LLM is unavailable."""
    insights: list[Insight] = []

    numeric_cols = {k: v for k, v in profile.items() if v.get("mean") is not None}
    categorical_cols = {k: v for k, v in profile.items() if "top_values" in v}

    # 1. High variability detection
    for col, info in numeric_cols.items():
        mean = info.get("mean", 0)
        std = info.get("std", 0)
        if mean and std and abs(mean) > 0.01:
            cv = abs(std / mean)
            if cv > 1.0:
                insights.append(Insight(
                    title=f"High variability in {col}",
                    description=f"The coefficient of variation for '{col}' is {cv:.2f}, indicating highly dispersed values (mean={mean:.2f}, std={std:.2f}). Consider investigating outliers.",
                    category="anomaly",
                    confidence=min(0.9, 0.5 + cv * 0.2),
                    affected_columns=[col],
                ))

    # 2. Skewness detection (using min/max/mean heuristic)
    for col, info in numeric_cols.items():
        mn, mx, mean = info.get("min"), info.get("max"), info.get("mean")
        median = info.get("median")
        if mn is not None and mx is not None and mean is not None and median is not None:
            rng = mx - mn
            if rng > 0:
                skew_indicator = (mean - median) / rng
                if abs(skew_indicator) > 0.1:
                    direction = "right" if skew_indicator > 0 else "left"
                    insights.append(Insight(
                        title=f"Skewed distribution in {col}",
                        description=f"'{col}' appears {direction}-skewed (mean={mean:.2f}, median={median:.2f}). The mean-median gap suggests a non-symmetric distribution.",
                        category="distribution",
                        confidence=min(0.85, 0.5 + abs(skew_indicator)),
                        affected_columns=[col],
                    ))

    # 3. Potential data quality issues (high null counts)
    for col, info in profile.items():
        null_count = info.get("null_count", 0)
        if null_count > 0:
            insights.append(Insight(
                title=f"Missing values in {col}",
                description=f"'{col}' has {null_count} null values. These were handled during ETL, but the original data had gaps worth investigating.",
                category="anomaly",
                confidence=0.95,
                affected_columns=[col],
            ))

    # 4. Low cardinality numeric columns
    for col, info in numeric_cols.items():
        unique = info.get("unique_count", 0)
        if 0 < unique <= 5:
            insights.append(Insight(
                title=f"Low cardinality numeric: {col}",
                description=f"'{col}' is numeric but has only {unique} unique values. It may be better treated as a categorical variable for analysis.",
                category="recommendation",
                confidence=0.8,
                affected_columns=[col],
            ))

    # 5. Dominant category detection
    for col, info in categorical_cols.items():
        top_values = info.get("top_values", {})
        if top_values:
            total = sum(top_values.values())
            top_val = max(top_values, key=top_values.get)
            top_count = top_values[top_val]
            if total > 0 and top_count / total > 0.5:
                pct = (top_count / total) * 100
                insights.append(Insight(
                    title=f"Dominant category in {col}",
                    description=f"'{top_val}' accounts for {pct:.1f}% of values in '{col}'. This imbalance may skew aggregations that group by this column.",
                    category="distribution",
                    confidence=0.85,
                    affected_columns=[col],
                ))

    # Sort by confidence, take top N
    insights.sort(key=lambda x: x.confidence, reverse=True)
    insights = insights[:max_insights]

    summary = f"Rule-based analysis identified {len(insights)} insight(s) across {len(profile)} columns."
    if not is_ai_available():
        summary += " Configure an OpenAI API key for richer AI-powered insights."

    return InsightResponse(
        dataset_id=dataset_id,
        insights=insights,
        summary=summary,
        token_usage=0,
    )


# ═══════════════════════════════════════════════════════════════════
# 2. NATURAL LANGUAGE QUERY
# ═══════════════════════════════════════════════════════════════════

async def natural_language_query(
    dataset_id: uuid.UUID,
    owner_id: uuid.UUID,
    db: AsyncSession,
    question: str,
) -> NLQueryResponse:
    """
    Translate a natural language question into an analytics API call and execute it.
    Requires OpenAI API key.
    """
    if not is_ai_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Natural language queries require an OpenAI API key. Please configure OPENAI_API_KEY.",
        )

    ds = await _get_dataset(dataset_id, owner_id, db)
    profile = ds.profile or {}
    profile_text = _profile_to_text(profile)

    system_prompt = """You are a data query translator. Given a dataset schema and a natural language question, generate a query configuration.

Return a JSON object with this exact structure:
{
  "query_type": "aggregate" or "chart",
  "config": { ... },
  "explanation": "what this query does in plain English"
}

For query_type "aggregate", config must have:
  { "group_by": ["col1"], "metrics": [{"column": "col2", "function": "sum|mean|median|min|max|count|nunique"}] }

For query_type "chart", config must have:
  { "chart_type": "bar|line|pie|scatter|histogram", "x_column": "col1", "y_column": "col2" }

Rules:
- Use ONLY column names from the schema provided
- Choose the most appropriate query type for the question
- For "how many" / "count" questions, use aggregate with count function
- For "distribution" / "breakdown" questions, use chart with bar or pie
- For "trend" / "over time" questions, use chart with line
- For "compare" questions, use aggregate with group_by
- Return ONLY valid JSON, no markdown"""

    user_prompt = f"""Dataset columns and types:
{profile_text}

Question: {question}"""

    try:
        result = await generate_json_completion(system_prompt, user_prompt, temperature=0.2, max_tokens=1000)

        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not interpret the question. Please rephrase.",
            )

        query_type = result.get("query_type", "aggregate")
        config = result.get("config", {})
        explanation = result.get("explanation", "")

        generated = GeneratedQuery(
            query_type=query_type,
            config=config,
            explanation=explanation,
        )

        # Execute the generated query
        df = await _load_dataframe(dataset_id, owner_id, db)
        exec_result: dict[str, Any] = {}

        if query_type == "aggregate":
            group_by = config.get("group_by", [])
            metrics_raw = config.get("metrics", [])
            metrics = [MetricSpec(column=m["column"], function=m["function"]) for m in metrics_raw]
            agg = compute_aggregation(df, group_by, metrics)
            exec_result = agg.model_dump()
        elif query_type == "chart":
            chart_type = config.get("chart_type", "bar")
            x_col = config.get("x_column", "")
            y_col = config.get("y_column")
            chart = compute_chart_data(df, chart_type, x_col, y_col)
            exec_result = chart.model_dump()
        else:
            exec_result = {"message": "Unknown query type"}

        return NLQueryResponse(
            dataset_id=dataset_id,
            question=question,
            generated_query=generated,
            result=exec_result,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"NL query failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process query: {str(e)}",
        )


# ═══════════════════════════════════════════════════════════════════
# 3. FORECASTING
# ═══════════════════════════════════════════════════════════════════

async def generate_forecast(
    dataset_id: uuid.UUID,
    owner_id: uuid.UUID,
    db: AsyncSession,
    date_column: str,
    value_column: str,
    periods: int = 30,
    frequency: str = "D",
) -> ForecastResponse:
    """
    Time-series forecasting using Holt-Winters exponential smoothing.
    Works without OpenAI — LLM is only used for optional narrative.
    """
    df = await _load_dataframe(dataset_id, owner_id, db)

    # Validate columns
    if date_column not in df.columns:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Column not found: {date_column}")
    if value_column not in df.columns:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Column not found: {value_column}")

    # Prepare time series
    ts_df = df[[date_column, value_column]].copy()
    ts_df[date_column] = pd.to_datetime(ts_df[date_column], errors="coerce")
    ts_df[value_column] = pd.to_numeric(ts_df[value_column], errors="coerce")
    ts_df = ts_df.dropna()

    if len(ts_df) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough data points for forecasting (need at least 4).",
        )

    # Sort and aggregate by frequency
    ts_df = ts_df.sort_values(date_column)
    ts_df = ts_df.set_index(date_column)

    freq_map = {"D": "D", "W": "W", "M": "ME"}
    resample_freq = freq_map.get(frequency, "D")
    ts_resampled = ts_df[value_column].resample(resample_freq).mean().dropna()

    if len(ts_resampled) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not enough data points after resampling to {frequency} frequency.",
        )

    # Historical data for response
    historical = [
        {"date": str(idx.date()), "value": round(float(val), 4)}
        for idx, val in ts_resampled.items()
    ]

    # Holt-Winters Exponential Smoothing
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    try:
        # Determine if seasonal component is viable
        seasonal_periods = {"D": 7, "W": 4, "M": 12}.get(frequency, 7)
        use_seasonal = len(ts_resampled) >= 2 * seasonal_periods

        if use_seasonal:
            model = ExponentialSmoothing(
                ts_resampled,
                trend="add",
                seasonal="add",
                seasonal_periods=seasonal_periods,
            ).fit(optimized=True)
        else:
            model = ExponentialSmoothing(
                ts_resampled,
                trend="add",
                seasonal=None,
            ).fit(optimized=True)

        # Forecast
        forecast_values = model.forecast(periods)

        # Confidence interval from residual std
        residuals = model.resid.dropna()
        residual_std = float(residuals.std()) if len(residuals) > 0 else 0.0

        forecast_points = []
        for i, (idx, val) in enumerate(forecast_values.items()):
            # Widen confidence interval further into the future
            margin = 1.96 * residual_std * np.sqrt(1 + i * 0.1)
            forecast_points.append(ForecastPoint(
                date=str(idx.date()),
                value=round(float(val), 4),
                lower_bound=round(float(val) - margin, 4),
                upper_bound=round(float(val) + margin, 4),
            ))

    except Exception as e:
        logger.warning(f"Holt-Winters failed ({e}), falling back to linear trend")
        # Fallback: simple linear extrapolation
        x = np.arange(len(ts_resampled))
        y = ts_resampled.values.astype(float)
        coeffs = np.polyfit(x, y, 1)
        residual_std = float(np.std(y - np.polyval(coeffs, x)))

        last_date = ts_resampled.index[-1]
        forecast_points = []
        for i in range(1, periods + 1):
            future_val = float(np.polyval(coeffs, len(ts_resampled) + i))
            margin = 1.96 * residual_std * np.sqrt(1 + i * 0.1)
            future_date = last_date + pd.DateOffset(**{
                "D": {"days": i}, "W": {"weeks": i}, "M": {"months": i},
            }.get(frequency, {"days": i}))
            forecast_points.append(ForecastPoint(
                date=str(future_date.date()),
                value=round(future_val, 4),
                lower_bound=round(future_val - margin, 4),
                upper_bound=round(future_val + margin, 4),
            ))

    # Optional LLM narrative
    summary = _basic_forecast_summary(historical, forecast_points, value_column)
    if is_ai_available():
        try:
            narrative = await generate_completion(
                system_prompt="You are a data analyst. Write a brief 2-3 sentence forecast summary.",
                user_prompt=f"Column: {value_column}. Last value: {historical[-1]['value']}. "
                           f"Forecast {periods} periods ({frequency}). "
                           f"Predicted range: {forecast_points[0].value} to {forecast_points[-1].value}. "
                           f"Confidence band: ±{abs(forecast_points[-1].upper_bound - forecast_points[-1].value):.2f}",
                temperature=0.3,
                max_tokens=200,
            )
            summary = narrative
        except Exception as e:
            logger.warning(f"LLM narrative failed: {e}")

    return ForecastResponse(
        dataset_id=dataset_id,
        date_column=date_column,
        value_column=value_column,
        historical=historical,
        forecast=forecast_points,
        summary=summary,
    )


def _basic_forecast_summary(
    historical: list[dict], forecast: list[ForecastPoint], value_column: str,
) -> str:
    """Generate a basic forecast summary without LLM."""
    last_val = historical[-1]["value"]
    last_forecast = forecast[-1].value
    direction = "upward" if last_forecast > last_val else "downward" if last_forecast < last_val else "stable"

    return (
        f"Based on {len(historical)} historical data points for '{value_column}', "
        f"the forecast shows a {direction} trend. "
        f"Values are projected to move from {last_val:.2f} to {last_forecast:.2f} "
        f"over the next {len(forecast)} periods."
    )
