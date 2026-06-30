import api from "@/services/api";

// ── Types ────────────────────────────────────────────────────────

export interface InsightRequest {
  max_insights?: number;
}

export interface Insight {
  title: string;
  description: string;
  category: "trend" | "anomaly" | "correlation" | "distribution" | "recommendation";
  confidence: number;
  affected_columns: string[];
}

export interface InsightResponse {
  dataset_id: string;
  insights: Insight[];
  summary: string;
  token_usage: number;
}

export interface NLQueryRequest {
  question: string;
}

export interface GeneratedQuery {
  query_type: "aggregate" | "chart";
  config: Record<string, any>;
  explanation: string;
}

export interface NLQueryResponse {
  dataset_id: string;
  question: string;
  generated_query: GeneratedQuery;
  result: Record<string, any>;
}

export interface ForecastRequest {
  date_column: string;
  value_column: string;
  periods?: number;
  frequency?: "D" | "W" | "M";
}

export interface ForecastPoint {
  date: string;
  value: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ForecastResponse {
  dataset_id: string;
  date_column: string;
  value_column: string;
  historical: { date: string; value: number }[];
  forecast: ForecastPoint[];
  summary: string;
}

// ── API client ───────────────────────────────────────────────────

export const intelligenceApi = {
  insights: (datasetId: string, maxInsights: number = 5) =>
    api.post<InsightResponse>(`/intelligence/${datasetId}/insights`, {
      max_insights: maxInsights,
    }),

  nlQuery: (datasetId: string, question: string) =>
    api.post<NLQueryResponse>(`/intelligence/${datasetId}/nl-query`, {
      question,
    }),

  forecast: (datasetId: string, body: ForecastRequest) =>
    api.post<ForecastResponse>(`/intelligence/${datasetId}/forecast`, body),
};
