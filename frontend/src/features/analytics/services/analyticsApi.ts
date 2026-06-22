import api from "@/services/api";

// ── Types ────────────────────────────────────────────────────────

export interface FilterSpec {
  column: string;
  operator: string;
  value: any;
}

export interface MetricSpec {
  column: string;
  function: string;
}

export interface AggregateRequest {
  group_by: string[];
  metrics: MetricSpec[];
  filters: FilterSpec[];
}

export interface AggregateResponse {
  columns: string[];
  rows: Record<string, any>[];
  total_rows: number;
}

export interface ChartRequest {
  chart_type: "bar" | "line" | "pie" | "scatter" | "histogram";
  x_column: string;
  y_column?: string;
  group_by?: string;
  filters: FilterSpec[];
  bins?: number;
}

export interface ChartSeries {
  name: string;
  data: any[];
}

export interface ChartResponse {
  chart_type: string;
  labels: any[];
  series: ChartSeries[];
}

export interface CorrelationResponse {
  columns: string[];
  matrix: (number | null)[][];
}

export interface ColumnSummary {
  column: string;
  dtype: string;
  count: number;
  null_count: number;
  unique_count: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  median?: number;
  p25?: number;
  p75?: number;
  skewness?: number;
  histogram?: { counts: number[]; edges: number[] };
  top_values?: Record<string, number>;
}

export interface SummaryResponse {
  dataset_id: string;
  row_count: number;
  column_count: number;
  numeric_columns: number;
  categorical_columns: number;
  columns: ColumnSummary[];
}

// ── API client ───────────────────────────────────────────────────

export const analyticsApi = {
  aggregate: (datasetId: string, body: AggregateRequest) =>
    api.post<AggregateResponse>(`/analytics/${datasetId}/aggregate`, body),

  chart: (datasetId: string, body: ChartRequest) =>
    api.post<ChartResponse>(`/analytics/${datasetId}/chart`, body),

  correlation: (datasetId: string) =>
    api.get<CorrelationResponse>(`/analytics/${datasetId}/correlation`),

  summary: (datasetId: string) =>
    api.get<SummaryResponse>(`/analytics/${datasetId}/summary`),
};
