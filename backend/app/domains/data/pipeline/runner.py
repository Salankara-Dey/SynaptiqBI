"""
Pipeline runner — composes steps in order and executes them.
Designed for easy step injection in tests and future extension
(e.g. adding an OutlierFlaggingStep in Phase 3).
"""
import pandas as pd
from app.domains.data.pipeline.base import PipelineStep
from app.domains.data.pipeline.steps import (
    StripWhitespaceStep, TypeInferenceStep, NullHandlerStep,
    DeduplicationStep, ProfilerStep,
)

DEFAULT_STEPS: list[PipelineStep] = [
    StripWhitespaceStep(),
    TypeInferenceStep(),
    NullHandlerStep(),
    DeduplicationStep(),
    ProfilerStep(),  # Must be last — profiles the final clean state
]


def run_pipeline(df: pd.DataFrame, steps: list[PipelineStep] | None = None) -> dict:
    """
    Execute the ETL pipeline and return:
    { df, column_types, profile, steps, clean_row_count }
    """
    ctx: dict = {"steps": []}
    pipeline = steps or DEFAULT_STEPS

    for step in pipeline:
        try:
            df, ctx = step.run(df, ctx)
        except Exception as exc:
            raise RuntimeError(f"ETL step '{step.name}' failed: {exc}") from exc

    return {
        "df": df,
        "column_types": ctx.get("column_types", {}),
        "profile": ctx.get("profile", {}),
        "steps": ctx["steps"],
        "clean_row_count": len(df),
    }
