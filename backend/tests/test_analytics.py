"""Unit tests for Phase 3 analytics service — pure DataFrame tests, no DB or HTTP."""
import uuid
import numpy as np
import pandas as pd
import pytest

from app.domains.analytics.schemas import MetricSpec, FilterSpec
from app.domains.analytics.analytics_service import (
    compute_aggregation, compute_chart_data, compute_correlation,
    compute_summary, _apply_filters,
)


# ── Fixtures ──────────────────────────────────────────────────────

@pytest.fixture
def sales_df():
    return pd.DataFrame({
        "region": ["East", "East", "West", "West", "North", "North"],
        "product": ["A", "B", "A", "B", "A", "B"],
        "revenue": [100, 200, 150, 250, 120, 180],
        "units": [10, 20, 15, 25, 12, 18],
    })


@pytest.fixture
def numeric_df():
    np.random.seed(42)
    return pd.DataFrame({
        "x": np.random.randn(100),
        "y": np.random.randn(100) * 2,
        "z": np.random.randn(100) + 5,
    })


@pytest.fixture
def mixed_df():
    return pd.DataFrame({
        "category": ["A", "B", "A", "C", "B", "A", "C", "C", "B", "A"],
        "value": [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        "label": ["x", "y", "x", "z", "y", "x", "z", "z", "y", "x"],
    })


# ── Aggregation tests ────────────────────────────────────────────

def test_aggregation_grouped_sum(sales_df):
    result = compute_aggregation(
        sales_df,
        group_by=["region"],
        metrics=[MetricSpec(column="revenue", function="sum")],
    )
    assert result.total_rows == 3
    assert "revenue_sum" in result.columns
    row_dict = {r["region"]: r["revenue_sum"] for r in result.rows}
    assert row_dict["East"] == 300
    assert row_dict["West"] == 400


def test_aggregation_global(sales_df):
    result = compute_aggregation(
        sales_df,
        group_by=[],
        metrics=[
            MetricSpec(column="revenue", function="sum"),
            MetricSpec(column="revenue", function="mean"),
        ],
    )
    assert result.total_rows == 1
    assert result.rows[0]["revenue_sum"] == 1000
    assert abs(result.rows[0]["revenue_mean"] - 166.6667) < 0.1


def test_aggregation_multiple_metrics(sales_df):
    result = compute_aggregation(
        sales_df,
        group_by=["product"],
        metrics=[
            MetricSpec(column="revenue", function="sum"),
            MetricSpec(column="units", function="mean"),
        ],
    )
    assert result.total_rows == 2
    assert "revenue_sum" in result.columns
    assert "units_mean" in result.columns


# ── Filter tests ─────────────────────────────────────────────────

def test_filter_eq(sales_df):
    filtered = _apply_filters(sales_df, [FilterSpec(column="region", operator="eq", value="East")])
    assert len(filtered) == 2
    assert all(filtered["region"] == "East")


def test_filter_gt(sales_df):
    filtered = _apply_filters(sales_df, [FilterSpec(column="revenue", operator="gt", value=150)])
    assert all(filtered["revenue"] > 150)


def test_filter_contains(sales_df):
    filtered = _apply_filters(sales_df, [FilterSpec(column="region", operator="contains", value="ast")])
    assert len(filtered) == 2


# ── Chart data tests ─────────────────────────────────────────────

def test_histogram(numeric_df):
    result = compute_chart_data(numeric_df, "histogram", "x", bins=10)
    assert result.chart_type == "histogram"
    assert len(result.labels) == 10
    assert len(result.series) == 1
    assert sum(result.series[0].data) == 100  # All points accounted for


def test_bar_chart(sales_df):
    result = compute_chart_data(sales_df, "bar", "region", "revenue")
    assert result.chart_type == "bar"
    assert len(result.labels) == 3
    assert len(result.series) == 1


def test_pie_chart_counts(mixed_df):
    result = compute_chart_data(mixed_df, "pie", "category")
    assert result.chart_type == "pie"
    assert len(result.labels) == 3
    assert sum(result.series[0].data) == 10  # Total count


def test_scatter_chart(numeric_df):
    result = compute_chart_data(numeric_df, "scatter", "x", "y")
    assert result.chart_type == "scatter"
    assert len(result.labels) == 100
    assert len(result.series[0].data) == 100


def test_line_chart_grouped(sales_df):
    result = compute_chart_data(sales_df, "line", "region", "revenue", group_by="product")
    assert result.chart_type == "line"
    assert len(result.series) == 2  # Two products


# ── Correlation tests ────────────────────────────────────────────

def test_correlation_matrix(numeric_df):
    result = compute_correlation(numeric_df)
    assert len(result.columns) == 3
    assert len(result.matrix) == 3
    # Diagonal should be 1.0
    for i in range(3):
        assert result.matrix[i][i] == 1.0


def test_correlation_empty():
    df = pd.DataFrame({"text_only": ["a", "b", "c"]})
    result = compute_correlation(df)
    assert result.matrix == []


# ── Summary tests ─────────────────────────────────────────────────

def test_summary_stats(mixed_df):
    ds_id = uuid.uuid4()
    result = compute_summary(mixed_df, ds_id)
    assert result.row_count == 10
    assert result.column_count == 3
    assert result.numeric_columns == 1
    assert result.categorical_columns == 2

    # Find the numeric column
    value_col = next(c for c in result.columns if c.column == "value")
    assert value_col.mean == 55.0
    assert value_col.p25 is not None
    assert value_col.p75 is not None
    assert value_col.skewness is not None
    assert value_col.histogram is not None

    # Find a categorical column
    cat_col = next(c for c in result.columns if c.column == "category")
    assert cat_col.top_values is not None
    assert "A" in cat_col.top_values


def test_summary_percentiles(numeric_df):
    ds_id = uuid.uuid4()
    result = compute_summary(numeric_df, ds_id)
    x_col = next(c for c in result.columns if c.column == "x")
    assert x_col.p25 is not None
    assert x_col.median is not None
    assert x_col.p75 is not None
    assert x_col.p25 <= x_col.median <= x_col.p75
