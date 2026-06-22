"""
Analytics service — pure computation on DataFrames.

No HTTP or SQLAlchemy awareness.  Receives a DataFrame (loaded by the
route layer from DatasetRow records) and returns structured results.
Every function is independently testable with synthetic DataFrames.
"""
import uuid
import numpy as np
import pandas as pd
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.db.models.dataset import Dataset, DatasetRow
from app.domains.analytics.schemas import (
    FilterSpec, MetricSpec,
    AggregateResponse, ChartResponse, ChartSeries,
    CorrelationResponse, SummaryResponse, ColumnSummary,
)


# ── DataFrame loader ─────────────────────────────────────────────

async def _load_dataframe(
    dataset_id: uuid.UUID, owner_id: uuid.UUID, db: AsyncSession,
    filters: list[FilterSpec] | None = None,
) -> pd.DataFrame:
    """Load all DatasetRows for a dataset into a Pandas DataFrame."""
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

    result = await db.execute(
        select(DatasetRow).where(DatasetRow.dataset_id == dataset_id).order_by(DatasetRow.row_index)
    )
    rows = [r.data for r in result.scalars().all()]
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset has no rows")

    df = pd.DataFrame(rows)

    # Apply filters
    if filters:
        df = _apply_filters(df, filters)

    return df


def _apply_filters(df: pd.DataFrame, filters: list[FilterSpec]) -> pd.DataFrame:
    """Apply client-specified filters to a DataFrame."""
    for f in filters:
        if f.column not in df.columns:
            continue
        col = df[f.column]
        op = f.operator
        val = f.value

        if op == "eq":
            df = df[col == val]
        elif op == "ne":
            df = df[col != val]
        elif op == "gt":
            df = df[pd.to_numeric(col, errors="coerce") > float(val)]
        elif op == "gte":
            df = df[pd.to_numeric(col, errors="coerce") >= float(val)]
        elif op == "lt":
            df = df[pd.to_numeric(col, errors="coerce") < float(val)]
        elif op == "lte":
            df = df[pd.to_numeric(col, errors="coerce") <= float(val)]
        elif op == "contains":
            df = df[col.astype(str).str.contains(str(val), case=False, na=False)]
        elif op == "not_contains":
            df = df[~col.astype(str).str.contains(str(val), case=False, na=False)]

    return df


# ── Aggregation ───────────────────────────────────────────────────

ALLOWED_AGG_FUNCTIONS = {"sum", "mean", "median", "min", "max", "count", "nunique"}


def compute_aggregation(df: pd.DataFrame, group_by: list[str], metrics: list[MetricSpec]) -> AggregateResponse:
    """Group-by aggregation on a DataFrame."""
    # Validate
    for m in metrics:
        if m.function not in ALLOWED_AGG_FUNCTIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported aggregation function: {m.function}",
            )
        if m.column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Column not found: {m.column}",
            )
    for col in group_by:
        if col not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Group-by column not found: {col}",
            )

    # Coerce numeric columns for aggregation
    for m in metrics:
        if m.function in {"sum", "mean", "median", "min", "max"}:
            df[m.column] = pd.to_numeric(df[m.column], errors="coerce")

    agg_spec = {}
    result_columns = list(group_by)
    for m in metrics:
        label = f"{m.column}_{m.function}"
        agg_spec[label] = pd.NamedAgg(column=m.column, aggfunc=m.function)
        result_columns.append(label)

    if group_by:
        agg_df = df.groupby(group_by, dropna=False).agg(**agg_spec).reset_index()
    else:
        # Global aggregation — single row result
        agg_dict = {}
        for m in metrics:
            label = f"{m.column}_{m.function}"
            agg_dict[label] = [getattr(df[m.column], m.function)()]
        agg_df = pd.DataFrame(agg_dict)

    # Sanitise NaN / inf for JSON
    agg_df = agg_df.replace([np.inf, -np.inf], None)
    rows = agg_df.where(agg_df.notna(), None).to_dict(orient="records")

    return AggregateResponse(
        columns=list(agg_df.columns),
        rows=rows,
        total_rows=len(rows),
    )


# ── Chart data ────────────────────────────────────────────────────

def compute_chart_data(
    df: pd.DataFrame,
    chart_type: str,
    x_column: str,
    y_column: str | None = None,
    group_by: str | None = None,
    bins: int = 20,
) -> ChartResponse:
    """Format DataFrame data for a specific chart type."""
    if x_column not in df.columns:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Column not found: {x_column}")
    if y_column and y_column not in df.columns:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Column not found: {y_column}")
    if group_by and group_by not in df.columns:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Column not found: {group_by}")

    if chart_type == "histogram":
        return _histogram(df, x_column, bins)
    elif chart_type == "pie":
        return _pie(df, x_column, y_column)
    elif chart_type == "scatter":
        return _scatter(df, x_column, y_column)
    elif chart_type in ("bar", "line"):
        return _bar_or_line(df, chart_type, x_column, y_column, group_by)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported chart type: {chart_type}")


def _histogram(df: pd.DataFrame, column: str, bins: int) -> ChartResponse:
    numeric = pd.to_numeric(df[column], errors="coerce").dropna()
    if numeric.empty:
        return ChartResponse(chart_type="histogram", labels=[], series=[])

    counts, edges = np.histogram(numeric, bins=bins)
    labels = [f"{round(edges[i], 2)}–{round(edges[i + 1], 2)}" for i in range(len(counts))]
    return ChartResponse(
        chart_type="histogram",
        labels=labels,
        series=[ChartSeries(name=column, data=[int(c) for c in counts])],
    )


def _pie(df: pd.DataFrame, x_column: str, y_column: str | None) -> ChartResponse:
    if y_column:
        # Sum y values grouped by x
        df[y_column] = pd.to_numeric(df[y_column], errors="coerce")
        grouped = df.groupby(x_column)[y_column].sum().sort_values(ascending=False).head(15)
        labels = [str(l) for l in grouped.index.tolist()]
        data = [round(float(v), 4) if not np.isnan(v) else 0 for v in grouped.values]
    else:
        # Count occurrences of x
        counts = df[x_column].value_counts().head(15)
        labels = [str(l) for l in counts.index.tolist()]
        data = [int(v) for v in counts.values]

    return ChartResponse(
        chart_type="pie",
        labels=labels,
        series=[ChartSeries(name=x_column, data=data)],
    )


def _scatter(df: pd.DataFrame, x_column: str, y_column: str | None) -> ChartResponse:
    if not y_column:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scatter chart requires y_column")

    df = df.copy()
    df[x_column] = pd.to_numeric(df[x_column], errors="coerce")
    df[y_column] = pd.to_numeric(df[y_column], errors="coerce")
    clean = df[[x_column, y_column]].dropna().head(500)  # Cap at 500 points

    return ChartResponse(
        chart_type="scatter",
        labels=[round(float(v), 4) for v in clean[x_column]],
        series=[ChartSeries(name=y_column, data=[round(float(v), 4) for v in clean[y_column]])],
    )


def _bar_or_line(
    df: pd.DataFrame, chart_type: str,
    x_column: str, y_column: str | None, group_by: str | None,
) -> ChartResponse:
    df = df.copy()

    if y_column:
        df[y_column] = pd.to_numeric(df[y_column], errors="coerce")

    if group_by:
        groups = df[group_by].unique()[:10]  # Limit to 10 groups
        all_labels = sorted(df[x_column].dropna().unique().tolist())[:50]
        series = []
        for g in groups:
            sub = df[df[group_by] == g]
            if y_column:
                grouped = sub.groupby(x_column)[y_column].mean()
            else:
                grouped = sub.groupby(x_column).size()
            data = [_safe_number(grouped.get(lbl)) for lbl in all_labels]
            series.append(ChartSeries(name=str(g), data=data))
        labels = [str(l) for l in all_labels]
    else:
        if y_column:
            grouped = df.groupby(x_column)[y_column].mean().sort_index()
        else:
            grouped = df[x_column].value_counts().sort_index().head(50)
        labels = [str(l) for l in grouped.index.tolist()]
        data = [_safe_number(v) for v in grouped.values]
        series = [ChartSeries(name=y_column or "count", data=data)]

    return ChartResponse(chart_type=chart_type, labels=labels, series=series)


def _safe_number(v: Any) -> Any:
    """Convert numpy values to JSON-safe Python types."""
    if v is None:
        return 0
    try:
        f = float(v)
        return round(f, 4) if not np.isnan(f) else 0
    except (TypeError, ValueError):
        return 0


# ── Correlation matrix ───────────────────────────────────────────

def compute_correlation(df: pd.DataFrame) -> CorrelationResponse:
    """Pearson correlation matrix for all numeric columns."""
    numeric_df = df.select_dtypes(include="number")
    if numeric_df.empty or numeric_df.shape[1] < 2:
        return CorrelationResponse(columns=list(numeric_df.columns), matrix=[])

    corr = numeric_df.corr(method="pearson")
    columns = corr.columns.tolist()
    matrix = []
    for _, row in corr.iterrows():
        matrix.append([round(float(v), 4) if not np.isnan(v) else None for v in row])

    return CorrelationResponse(columns=columns, matrix=matrix)


# ── Summary statistics ───────────────────────────────────────────

def compute_summary(df: pd.DataFrame, dataset_id: uuid.UUID) -> SummaryResponse:
    """Enhanced summary statistics for every column."""
    summaries: list[ColumnSummary] = []
    numeric_count = 0
    categorical_count = 0

    for col in df.columns:
        series = df[col]
        dtype_str = str(series.dtype)
        is_numeric = pd.api.types.is_numeric_dtype(series)

        base = {
            "column": col,
            "dtype": "numeric" if is_numeric else "categorical",
            "count": int(series.count()),
            "null_count": int(series.isna().sum()),
            "unique_count": int(series.nunique()),
        }

        if is_numeric:
            numeric_count += 1
            desc = series.describe()
            skew_val = series.skew()

            # Histogram bins for distribution
            clean = series.dropna()
            hist_data = None
            if len(clean) > 0:
                counts, edges = np.histogram(clean, bins=min(20, len(clean)))
                hist_data = {
                    "counts": [int(c) for c in counts],
                    "edges": [round(float(e), 4) for e in edges],
                }

            base.update({
                "mean": _round_or_none(desc.get("mean")),
                "std": _round_or_none(desc.get("std")),
                "min": _round_or_none(desc.get("min")),
                "max": _round_or_none(desc.get("max")),
                "median": _round_or_none(series.median()),
                "p25": _round_or_none(desc.get("25%")),
                "p75": _round_or_none(desc.get("75%")),
                "skewness": _round_or_none(skew_val),
                "histogram": hist_data,
            })
        else:
            categorical_count += 1
            top = series.value_counts().head(10).to_dict()
            base["top_values"] = {str(k): int(v) for k, v in top.items()}

        summaries.append(ColumnSummary(**base))

    return SummaryResponse(
        dataset_id=dataset_id,
        row_count=len(df),
        column_count=len(df.columns),
        numeric_columns=numeric_count,
        categorical_columns=categorical_count,
        columns=summaries,
    )


def _round_or_none(val: Any) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        return round(f, 4) if not np.isnan(f) else None
    except (TypeError, ValueError):
        return None
