import { useState, useEffect, useCallback } from "react";
import { datasetsApi, Dataset } from "@/features/datasets/services/datasetsApi";
import {
  analyticsApi,
  SummaryResponse,
  ChartResponse,
  AggregateResponse,
  CorrelationResponse,
  AggregateRequest,
  ChartRequest,
} from "@/features/analytics/services/analyticsApi";

export function useAnalytics() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cached results
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [aggResult, setAggResult] = useState<AggregateResponse | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationResponse | null>(null);

  // Loading states
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [aggLoading, setAggLoading] = useState(false);
  const [corrLoading, setCorrLoading] = useState(false);

  // Load ready datasets
  useEffect(() => {
    datasetsApi.list().then((r) => {
      const ready = r.data.datasets.filter((d) => d.status === "ready");
      setDatasets(ready);
      if (ready.length > 0 && !selectedId) setSelectedId(ready[0].id);
    });
  }, []);

  // Auto-load summary when dataset changes
  useEffect(() => {
    if (!selectedId) return;
    setSummaryLoading(true);
    setSummary(null);
    setChart(null);
    setAggResult(null);
    setCorrelation(null);
    analyticsApi
      .summary(selectedId)
      .then((r) => setSummary(r.data))
      .catch(() => setError("Failed to load summary"))
      .finally(() => setSummaryLoading(false));
  }, [selectedId]);

  const fetchChart = useCallback(
    async (req: Omit<ChartRequest, "filters">) => {
      if (!selectedId) return;
      setChartLoading(true);
      setError(null);
      try {
        const r = await analyticsApi.chart(selectedId, { ...req, filters: [] });
        setChart(r.data);
      } catch {
        setError("Failed to load chart data");
      } finally {
        setChartLoading(false);
      }
    },
    [selectedId]
  );

  const fetchAggregation = useCallback(
    async (req: Omit<AggregateRequest, "filters">) => {
      if (!selectedId) return;
      setAggLoading(true);
      setError(null);
      try {
        const r = await analyticsApi.aggregate(selectedId, { ...req, filters: [] });
        setAggResult(r.data);
      } catch {
        setError("Failed to run aggregation");
      } finally {
        setAggLoading(false);
      }
    },
    [selectedId]
  );

  const fetchCorrelation = useCallback(async () => {
    if (!selectedId) return;
    setCorrLoading(true);
    setError(null);
    try {
      const r = await analyticsApi.correlation(selectedId);
      setCorrelation(r.data);
    } catch {
      setError("Failed to load correlation");
    } finally {
      setCorrLoading(false);
    }
  }, [selectedId]);

  return {
    datasets,
    selectedId,
    setSelectedId,
    summary,
    summaryLoading,
    chart,
    chartLoading,
    fetchChart,
    aggResult,
    aggLoading,
    fetchAggregation,
    correlation,
    corrLoading,
    fetchCorrelation,
    loading,
    error,
  };
}
