import { useState } from "react";
import { useAnalytics } from "@/features/analytics/hooks/useAnalytics";
import { ChartRenderer } from "./ChartRenderer";
import { AggregationBuilder } from "./AggregationBuilder";
import { CorrelationHeatmap } from "./CorrelationHeatmap";
import type { ChartRequest } from "@/features/analytics/services/analyticsApi";

const TABS = ["Charts Studio", "Aggregation Builder", "Correlation Matrix"] as const;
type Tab = (typeof TABS)[number];

const CHART_TYPES = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "scatter", label: "Scatter Plot" },
  { value: "histogram", label: "Histogram" },
] as const;

export default function AnalyticsPage() {
  const {
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
    error,
  } = useAnalytics();

  const [tab, setTab] = useState<Tab>("Charts Studio");

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
    if (t === "Correlation Matrix" && !correlation && !corrLoading) {
      fetchCorrelation();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-black/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded bg-neutral-900 text-lime-400">
            BUSINESS INTELLIGENCE
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Analytics & Visualization Studio</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Explore data distributions, compute multi-metric aggregations, and compute Pearson correlation matrices.
        </p>
      </div>

      {/* Dataset selector */}
      <div className="card p-5 mb-6 animate-fade-up flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-lime-400 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Target Dataset Selection</p>
            <p className="text-[11px] text-neutral-500">Choose a clean dataset for analytical query execution</p>
          </div>
        </div>

        {datasets.length === 0 ? (
          <p className="text-xs text-neutral-500">No ready datasets. Upload a dataset first.</p>
        ) : (
          <select
            value={selectedId || ""}
            onChange={(e) => {
              setSelectedId(e.target.value);
              defaultsSet[1](false);
            }}
            className="input-field max-w-md font-semibold text-slate-900"
          >
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name} ({ds.clean_row_count?.toLocaleString()} rows · {ds.raw_col_count} columns)
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl mb-6 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
          {error}
        </div>
      )}

      {summaryLoading && (
        <div className="flex items-center justify-center py-20 text-neutral-500">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
            <p className="text-xs font-bold text-slate-800">Profiling dataset schema & metrics...</p>
          </div>
        </div>
      )}

      {summary && (
        <>
          {/* Summary metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6 animate-fade-up-1">
            {[
              { label: "Clean Rows", value: summary.row_count.toLocaleString(), icon: "Rows" },
              { label: "Columns", value: summary.column_count, icon: "Cols" },
              { label: "Numeric", value: summary.numeric_columns, icon: "Num" },
              { label: "Categorical", value: summary.categorical_columns, icon: "Cat" },
              {
                label: "Completeness",
                value: (() => {
                  const totalNulls = summary.columns.reduce((a, c) => a + c.null_count, 0);
                  const totalCells = summary.row_count * summary.column_count;
                  return totalCells > 0 ? `${(((totalCells - totalNulls) / totalCells) * 100).toFixed(1)}%` : "—";
                })(),
                icon: "Score",
              },
            ].map(({ label, value, icon }, i) => (
              <div key={label} className="card p-4 animate-fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 mb-1">{icon} · {label}</p>
                <p className="text-xl font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Navigation tabs */}
          <div className="flex gap-2 mb-6 border-b border-black/10 pb-3 animate-fade-up-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  tab === t
                    ? "bg-neutral-900 text-lime-400 shadow-sm"
                    : "bg-white text-neutral-600 border border-black/5 hover:bg-slate-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Charts Studio Tab */}
          {tab === "Charts Studio" && (
            <div className="card p-6 animate-fade-up-2">
              <div className="flex flex-wrap items-end gap-3 mb-6 p-4 rounded-xl bg-slate-50 border border-black/5">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-1.5">Visualization Type</p>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as ChartRequest["chart_type"])}
                    className="input-field font-semibold text-slate-900"
                    style={{ minWidth: 150 }}
                  >
                    {CHART_TYPES.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-1.5">X Axis (Category / Dimension)</p>
                  <select value={xCol} onChange={(e) => setXCol(e.target.value)} className="input-field font-semibold text-slate-900" style={{ minWidth: 160 }}>
                    {allColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {chartType !== "histogram" && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-1.5">Y Axis (Metric Value)</p>
                    <select value={yCol} onChange={(e) => setYCol(e.target.value)} className="input-field font-semibold text-slate-900" style={{ minWidth: 160 }}>
                      <option value="">— Record Count —</option>
                      {numericColumns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button onClick={handleChartRun} disabled={chartLoading || !xCol} className="btn-primary">
                  {chartLoading ? "Rendering..." : "Generate Chart"}
                </button>
              </div>

              {chart ? (
                <div className="flex justify-center p-4 bg-white rounded-xl border border-black/5">
                  <ChartRenderer data={chart} width={Math.min(800, window.innerWidth - 340)} height={380} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 rounded-xl bg-slate-50 border border-dashed border-black/10 text-neutral-500">
                  <svg className="w-8 h-8 mb-2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  <p className="text-xs font-bold text-slate-900">Select X & Y dimensions above to construct visualization</p>
                </div>
              )}
            </div>
          )}

          {/* Aggregation Tab */}
          {tab === "Aggregation Builder" && (
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

          {/* Correlation Tab */}
          {tab === "Correlation Matrix" && (
            <div className="animate-fade-up-2">
              {corrLoading ? (
                <div className="flex items-center justify-center py-20 text-neutral-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                    <p className="text-xs font-bold text-slate-800">Computing Pearson correlation matrix...</p>
                  </div>
                </div>
              ) : correlation ? (
                <CorrelationHeatmap data={correlation} />
              ) : (
                <div className="card p-12 text-center text-xs font-bold text-neutral-500">
                  Loading correlation parameters...
                </div>
              )}
            </div>
          )}

          {/* Column statistical overview */}
          <div className="mt-10 animate-fade-up-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 mb-4">Column Profile Inspector</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.columns.map((col) => (
                <div key={col.column} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-slate-900">{col.column}</p>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        col.dtype === "numeric" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-600"
                      }`}
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
                            ["Std Dev", col.std?.toFixed(2)],
                          ]
                        : []),
                    ].map(([lbl, val]) => (
                      <div key={String(lbl)} className="p-2 rounded bg-slate-50 border border-black/5 text-center">
                        <p className="text-xs font-bold text-slate-900 truncate">{val ?? "—"}</p>
                        <p className="text-[10px] text-neutral-500 uppercase mt-0.5">{lbl}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!summary && !summaryLoading && datasets.length === 0 && (
        <div className="card p-12 text-center flex flex-col items-center border-dashed border-2">
          <p className="text-sm font-bold text-slate-900">No ready datasets available</p>
          <p className="text-xs text-neutral-500 mt-1">Upload a dataset to unlock analytics and visualization tools.</p>
        </div>
      )}
    </div>
  );
}
