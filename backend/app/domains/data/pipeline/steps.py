"""
Concrete ETL pipeline steps.

Order matters — each step expects the previous step's output.
Steps are intentionally opinionated: they make pragmatic decisions
(e.g. drop columns that are >80% null) that suit a BI context.
"""
import pandas as pd
import numpy as np
from app.domains.data.pipeline.base import PipelineStep


class StripWhitespaceStep(PipelineStep):
    """Strip leading/trailing whitespace from all string columns."""

    def run(self, df: pd.DataFrame, ctx: dict) -> tuple[pd.DataFrame, dict]:
        str_cols = df.select_dtypes(include="object").columns.tolist()
        df = df.copy()
        for col in str_cols:
            df[col] = df[col].str.strip()
        ctx["steps"].append({"step": self.name, "string_columns_stripped": len(str_cols)})
        return df, ctx


class TypeInferenceStep(PipelineStep):
    """
    Coerce columns to their most specific type.
    Pandas read_csv uses object dtype for ambiguous columns; this resolves that.
    Uses an 85% threshold so a few bad cells don't block the whole column.
    """

    def run(self, df: pd.DataFrame, ctx: dict) -> tuple[pd.DataFrame, dict]:
        df = df.copy()
        coerced = {}

        for col in df.columns:
            original_dtype = str(df[col].dtype)

            numeric = pd.to_numeric(df[col], errors="coerce")
            if numeric.notna().sum() / max(len(df), 1) > 0.85:
                df[col] = numeric
                coerced[col] = "numeric"
                continue

            if df[col].dtype == object:
                try:
                    parsed = pd.to_datetime(df[col], errors="coerce")
                    if parsed.notna().sum() / max(len(df), 1) > 0.85:
                        df[col] = parsed
                        coerced[col] = "datetime"
                        continue
                except Exception:
                    pass

            coerced[col] = original_dtype

        ctx["steps"].append({"step": self.name, "column_types": coerced})
        ctx["column_types"] = coerced
        return df, ctx


class NullHandlerStep(PipelineStep):
    """
    Context-aware null handling:
    - Numeric columns -> fill with median (robust to outliers)
    - String columns  -> fill with 'Unknown'
    - Columns >80% null -> drop entirely (not useful for BI)
    """
    NULL_THRESHOLD = 0.80

    def run(self, df: pd.DataFrame, ctx: dict) -> tuple[pd.DataFrame, dict]:
        df = df.copy()
        null_report = {}
        dropped = []

        for col in df.columns:
            null_ratio = df[col].isna().sum() / max(len(df), 1)

            if null_ratio > self.NULL_THRESHOLD:
                dropped.append(col)
                null_report[col] = {"action": "dropped", "null_ratio": round(null_ratio, 3)}
                continue
            if null_ratio == 0:
                continue

            if pd.api.types.is_numeric_dtype(df[col]):
                fill_val = df[col].median()
                df[col] = df[col].fillna(fill_val)
                null_report[col] = {
                    "action": "filled_median", "null_ratio": round(null_ratio, 3),
                    "fill_value": float(fill_val) if not np.isnan(fill_val) else 0
                }
            else:
                df[col] = df[col].fillna("Unknown")
                null_report[col] = {"action": "filled_unknown", "null_ratio": round(null_ratio, 3)}

        if dropped:
            df = df.drop(columns=dropped)

        ctx["steps"].append({"step": self.name, "null_handling": null_report, "columns_dropped": dropped})
        return df, ctx


class DeduplicationStep(PipelineStep):
    """Remove exact duplicate rows. In BI, duplicates skew aggregations."""

    def run(self, df: pd.DataFrame, ctx: dict) -> tuple[pd.DataFrame, dict]:
        before = len(df)
        df = df.drop_duplicates()
        removed = before - len(df)
        ctx["steps"].append({"step": self.name, "duplicates_removed": removed})
        return df, ctx


class ProfilerStep(PipelineStep):
    """
    Build a lightweight statistical profile of the clean dataset.
    Stored in the DB; the Phase 4 AI layer reads this summary —
    it never receives raw data, only this profile.
    """

    def run(self, df: pd.DataFrame, ctx: dict) -> tuple[pd.DataFrame, dict]:
        profile = {}

        for col in df.columns:
            col_data = df[col]
            col_profile: dict = {
                "dtype": str(col_data.dtype),
                "null_count": int(col_data.isna().sum()),
                "unique_count": int(col_data.nunique()),
            }

            if pd.api.types.is_numeric_dtype(col_data):
                desc = col_data.describe()
                col_profile.update({
                    "min": round(float(desc["min"]), 4) if not np.isnan(desc["min"]) else None,
                    "max": round(float(desc["max"]), 4) if not np.isnan(desc["max"]) else None,
                    "mean": round(float(desc["mean"]), 4) if not np.isnan(desc["mean"]) else None,
                    "std": round(float(desc["std"]), 4) if not np.isnan(desc["std"]) else None,
                    "median": round(float(col_data.median()), 4),
                })
            elif col_data.dtype == object:
                top = col_data.value_counts().head(5).to_dict()
                col_profile["top_values"] = {str(k): int(v) for k, v in top.items()}

            profile[col] = col_profile

        ctx["steps"].append({"step": self.name, "columns_profiled": len(df.columns)})
        ctx["profile"] = profile
        return df, ctx
