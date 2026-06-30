import { useState, useEffect, useCallback } from "react";
import { datasetsApi, Dataset } from "@/features/datasets/services/datasetsApi";
import {
  intelligenceApi,
  InsightResponse,
  NLQueryResponse,
  ForecastResponse,
  ForecastRequest,
} from "@/features/intelligence/services/intelligenceApi";

export function useIntelligence() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Insights state ──
  const [insights, setInsights] = useState<InsightResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // ── NL Query state ──
  const [nlResult, setNlResult] = useState<NLQueryResponse | null>(null);
  const [nlLoading, setNlLoading] = useState(false);
  const [nlHistory, setNlHistory] = useState<NLQueryResponse[]>([]);

  // ── Forecast state ──
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Load ready datasets
  useEffect(() => {
    datasetsApi.list().then((r) => {
      const ready = r.data.datasets.filter((d) => d.status === "ready");
      setDatasets(ready);
      if (ready.length > 0 && !selectedId) setSelectedId(ready[0].id);
    });
  }, []);

  // Reset when dataset changes
  useEffect(() => {
    setInsights(null);
    setNlResult(null);
    setNlHistory([]);
    setForecast(null);
    setError(null);
  }, [selectedId]);

  // ── Insights ──
  const fetchInsights = useCallback(
    async (maxInsights: number = 5) => {
      if (!selectedId) return;
      setInsightsLoading(true);
      setError(null);
      try {
        const r = await intelligenceApi.insights(selectedId, maxInsights);
        setInsights(r.data);
      } catch (err: any) {
        const msg = err.response?.data?.detail || "Failed to generate insights";
        setError(msg);
      } finally {
        setInsightsLoading(false);
      }
    },
    [selectedId]
  );

  // ── NL Query ──
  const askQuestion = useCallback(
    async (question: string) => {
      if (!selectedId) return;
      setNlLoading(true);
      setError(null);
      try {
        const r = await intelligenceApi.nlQuery(selectedId, question);
        setNlResult(r.data);
        setNlHistory((prev) => [r.data, ...prev]);
      } catch (err: any) {
        const msg = err.response?.data?.detail || "Failed to process question";
        setError(msg);
      } finally {
        setNlLoading(false);
      }
    },
    [selectedId]
  );

  // ── Forecast ──
  const fetchForecast = useCallback(
    async (body: ForecastRequest) => {
      if (!selectedId) return;
      setForecastLoading(true);
      setError(null);
      try {
        const r = await intelligenceApi.forecast(selectedId, body);
        setForecast(r.data);
      } catch (err: any) {
        const msg = err.response?.data?.detail || "Failed to generate forecast";
        setError(msg);
      } finally {
        setForecastLoading(false);
      }
    },
    [selectedId]
  );

  return {
    datasets,
    selectedId,
    setSelectedId,
    error,
    // Insights
    insights,
    insightsLoading,
    fetchInsights,
    // NL Query
    nlResult,
    nlLoading,
    nlHistory,
    askQuestion,
    // Forecast
    forecast,
    forecastLoading,
    fetchForecast,
  };
}
