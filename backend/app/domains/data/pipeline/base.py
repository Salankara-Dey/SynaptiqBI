"""
ETL pipeline step interface.

Each step receives a DataFrame and a context dict, transforms the DataFrame,
appends its own report to context["steps"], and returns both.
Steps are independently testable — no knowledge of FastAPI or SQLAlchemy.
"""
from abc import ABC, abstractmethod
import pandas as pd


class PipelineStep(ABC):
    @abstractmethod
    def run(self, df: pd.DataFrame, ctx: dict) -> tuple[pd.DataFrame, dict]:
        ...

    @property
    def name(self) -> str:
        return self.__class__.__name__
