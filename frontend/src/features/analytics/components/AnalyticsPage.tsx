import { useState } from "react";
import { useAnalytics } from "@/features/analytics/hooks/useAnalytics";
import { ChartRenderer } from "./ChartRenderer";
import { AggregationBuilder } from "./AggregationBuilder";
import { CorrelationHeatmap } from "./CorrelationHeatmap";
import type { ChartRequest } from "@/features/analytics/services/analyticsApi";

const TABS = ["Charts", "Aggregation", "Correlation"] as const;
type Tab = (typeof TABS)[number];

const CHART_TYPES = [
  { value: "bar", label: "Bar", icon: "▥" },
  { value: "line", label: "Line", icon: "⌇" },
  { value: "pie", label: "Pie", icon: "◕" },
  { value: "scatter", label: "Scatter", icon: "⁘" },
  { value: "histogram", label: "Histogram", icon: "▤" },
] as const;

export default function AnalyticsPage() {
  const {
    datasets, selectedId, setSelectedId,
    summary, summaryLoading,
    chart, chartLoading, fetchChart,
    aggResult, aggLoading, fetchAggregation,
    correlation, corrLoading, fetchCorrelation,
    error,
  } = useAnalytics();

  const [tab, setTab] = useState<Tab>("Charts");

  // Chart config state
  const [chartType, setChartType] = useState<ChartRequest["chart_type"]>("bar");
  const [xCol, setXCol] = useState("");
  const [yCol, setYCol] = useState("");

  const allColumns = summary?.columns.map((c) => c.column) || [];
  const numericColumns = summary?.columns.filter((c) => c.dtype === "numeric").map((c) => c.column) || [];
  const categoricalColumns = summary?.columns.filter((c) => c.dtype === "categorical").map((c) => c.column) || [];

  // Auto-set default columns when summary loads
  const defaultsSet = useState(false);
  if (summary && !defaultsSet[0]) {
    if (categoricalColumns.length > 0 && !xCol) setXCol(categoricalColumns[0]);
    else if (allColumns.length > 0 && !xCol) setXCol(allColumns[0]);
    if (numericColumns.length > 0 && !yCol) setYCol(numericColumns[0]);
    defaultsSet[1](true);
  }

  const handleChartRun = () => {
    if (!xCol) return;
    fetchChart({
      chart_type: chartType,
      x_column: xCol,
      y_column: yCol || undefined,
    });
  };

  // Load correlation on tab switch
  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === "Correlation" && !correlation && !corrLoading) {
      fetchCorrelation();
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Phase 3</p>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>Analytics</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Explore, aggregate, and visualize your datasets.</p>
      </div>

      {/* Dataset selector */}
      <div className="card p-5 mb-6 animate-fade-up">
        <div className="flex items-center gap-4">
          <label className="text-xs font-semibold tracking-widest uppercase shrink-0" style={{ color: "var(--muted)" }}>Dataset</label>
          {datasets.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>No ready datasets. Upload and process a dataset first.</p>
          ) : (
            <select
              value={selectedId || ""}
              onChange={(e) => {
                setSelectedId(e.target.value);
                defaultsSet[1](false);
              }}
              className="input-field !py-2 !text-sm"
              style={{ maxWidth: 400 }}
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.clean_row_count?.toLocaleString()} rows · {ds.raw_col_count} cols)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-center py-4 mb-4" style={{ color: "var(--danger)" }}>{error}</p>}

      {summaryLoading && (
        <div className="flex items-center justify-center py-20" style={{ color: "var(--muted)" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--ink)", borderTopColor: "transparent" }} />
            <p className="text-sm font-semibold">Loading dataset summary…</p>
          </div>
        </div>
      )}

      {summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6 animate-fade-up-1">
            {[
              { label: "Rows", value: summary.row_count.toLocaleString(), icon: "⊞" },
              { label: "Columns", value: summary.column_count, icon: "⊟" },
              { label: "Numeric", value: summary.numeric_columns, icon: "⊠" },
              { label: "Categorical", value: summary.categorical_columns, icon: "⊡" },
              {
                label: "Data Quality",
                value: (() => {
                  const totalNulls = summary.columns.reduce((a, c) => a + c.null_count, 0);
                  const totalCells = summary.row_count * summary.column_count;
                  return totalCells > 0 ? `${(((totalCells - totalNulls) / totalCells) * 100).toFixed(1)}%` : "—";
                })(),
                icon: "◎",
              },
            ].map(({ label, value, icon }, i) => (
              <div key={label} className="card p-4 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base" style={{ color: "var(--muted)" }}>{icon}</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{label}</span>
                </div>
                <p className="text-xl font-black" style={{ color: "var(--ink)" }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 animate-fade-up-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: tab === t ? "var(--ink)" : "transparent",
                  color: tab === t ? "var(--accent)" : "var(--muted)",
                  border: tab === t ? "1.5px solid var(--ink)" : "1.5px solid var(--border)",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Chart tab */}
          {tab === "Charts" && (
            <div className="card p-6 animate-fade-up-2">
              <div className="flex flex-wrap items-end gap-3 mb-6">
                {/* Chart type selector */}
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Type</p>
                  <div className="flex gap-1">
                    {CHART_TYPES.map(({ value, label, icon }) => (
                      <button
                        key={value}
                        onClick={() => setChartType(value as ChartRequest["chart_type"])}
                        className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: chartType === value ? "var(--ink)" : "var(--surface)",
                          color: chartType === value ? "var(--accent)" : "var(--ink)",
                          border: chartType === value ? "1.5px solid var(--ink)" : "1.5px solid var(--border)",
                        }}
                        title={label}
                      >
                        <span className="mr-1">{icon}</span>{label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* X column */}
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>X Column</p>
                  <select value={xCol} onChange={(e) => setXCol(e.target.value)} className="input-field !py-2 !text-xs" style={{ minWidth: 140 }}>
                    {allColumns.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Y column */}
                {chartType !== "histogram" && (
                  <div>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Y Column</p>
                    <select value={yCol} onChange={(e) => setYCol(e.target.value)} className="input-field !py-2 !text-xs" style={{ minWidth: 140 }}>
                      <option value="">— count —</option>
                      {numericColumns.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                <button onClick={handleChartRun} disabled={chartLoading || !xCol} className="btn-primary !py-2">
                  {chartLoading ? "Loading…" : "Generate"}
                </button>
              </div>

              {chart ? (
                <ChartRenderer data={chart} width={Math.min(700, window.innerWidth - 320)} height={380} />
              ) : (
                <div className="flex items-center justify-center h-60 rounded-xl" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                  <div className="text-center">
                    <span className="text-3xl block mb-2">⊟</span>
                    <p className="text-sm font-semibold">Select columns and generate a chart</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aggregation tab */}
          {tab === "Aggregation" && (
            <div className="card p-6 animate-fade-up-2">
              <AggregationBuilder
                columns={allColumns}
                numericColumns={numericColumns}
                onRun={fetchAggregation}
                result={aggResult}
                loading={aggLoading}
              />
            </div>
          )}

          {/* Correlation tab */}
          {tab === "Correlation" && (
            <div className="animate-fade-up-2">
              {corrLoading ? (
                <div className="flex items-center justify-center py-20" style={{ color: "var(--muted)" }}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--ink)", borderTopColor: "transparent" }} />
                    <p className="text-sm font-semibold">Computing correlation matrix…</p>
                  </div>
                </div>
              ) : correlation ? (
                <CorrelationHeatmap data={correlation} />
              ) : (
                <div className="flex items-center justify-center h-40 text-sm" style={{ color: "var(--muted)" }}>
                  Loading…
                </div>
              )}
            </div>
          )}

          {/* Column detail cards */}
          <div className="mt-8 animate-fade-up-3">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--muted)" }}>Column Statistics</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {summary.columns.map((col) => (
                <div key={col.column} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{col.column}</p>
                    <span
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={{
                        background: col.dtype === "numeric" ? "rgba(79,110,247,0.12)" : "rgba(138,137,144,0.12)",
                        color: col.dtype === "numeric" ? "#3b55e6" : "var(--muted)",
                      }}
                    >
                      {col.dtype === "numeric" ? "Numeric" : "Categorical"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["Count", col.count],
                      ["Nulls", col.null_count],
                      ["Unique", col.unique_count],
                      ...(col.dtype === "numeric"
                        ? [
                            ["Mean", col.mean?.toFixed(2)],
                            ["Median", col.median?.toFixed(2)],
                            ["Std", col.std?.toFixed(2)],
                            ["Min", col.min?.toFixed(2)],
                            ["Max", col.max?.toFixed(2)],
                            ["Skew", col.skewness?.toFixed(2)],
                          ]
                        : []),
                    ].map(([lbl, val]) => (
                      <div key={String(lbl)} className="text-center p-1.5 rounded-lg" style={{ background: "var(--surface)" }}>
                        <p className="text-xs font-bold truncate" style={{ color: "var(--ink)" }}>{val ?? "—"}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{lbl}</p>
                      </div>
                    ))}
                  </div>
                  {col.top_values && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {Object.entries(col.top_values).slice(0, 5).map(([k, v]) => (
                        <span key={k} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--ink)" }}>
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!summary && !summaryLoading && datasets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-up" style={{ color: "var(--muted)" }}>
          <span className="text-5xl mb-4">⊟</span>
          <p className="text-sm font-semibold">No datasets available</p>
          <p className="text-xs mt-1">Upload and process a CSV or XLSX dataset first, then come back here to explore it.</p>
        </div>
      )}
    </div>
  );
}
