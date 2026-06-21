"""Unit tests for ETL pipeline steps — no DB or HTTP needed."""
import pandas as pd
from app.domains.data.pipeline.runner import run_pipeline
from app.domains.data.pipeline.steps import NullHandlerStep, DeduplicationStep


def test_strip_whitespace_and_dedup():
    df = pd.DataFrame({"name": ["Alice ", " Bob", "Alice"], "age": [30, 25, 30]})
    result = run_pipeline(df)
    clean = result["df"]
    assert clean["name"].tolist() == ["Alice", "Bob"]  # whitespace stripped, dup removed
    assert result["clean_row_count"] == 2


def test_type_inference_numeric():
    df = pd.DataFrame({"price": ["10.5", "20.0", "30.25"]})
    result = run_pipeline(df)
    assert result["column_types"]["price"] == "numeric"
    assert pd.api.types.is_numeric_dtype(result["df"]["price"])


def test_null_handler_drops_high_null_column():
    df = pd.DataFrame({
        "keep": [1, 2, 3, 4, 5],
        "drop_me": [None, None, None, None, 1],  # 80% null
    })
    step = NullHandlerStep()
    cleaned, ctx = step.run(df, {"steps": []})
    assert "drop_me" not in cleaned.columns
    assert "keep" in cleaned.columns


def test_profiler_outputs_stats():
    df = pd.DataFrame({"score": [10, 20, 30, 40, 50]})
    result = run_pipeline(df)
    profile = result["profile"]["score"]
    assert profile["mean"] == 30.0
    assert profile["min"] == 10.0
    assert profile["max"] == 50.0
