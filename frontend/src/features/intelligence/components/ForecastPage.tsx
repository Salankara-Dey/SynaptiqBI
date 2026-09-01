import { useState, useEffect } from "react";
import { useIntelligence } from "@/features/intelligence/hooks/useIntelligence";
import { ForecastChart } from "./ForecastChart";
import { analyticsApi, SummaryResponse } from "@/features/analytics/services/analyticsApi";

export default function ForecastPage() {
  const { datasets, selectedId, setSelectedId, forecast, forecastLoading, fetchForecast, error } = useIntelligence();

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [dateCol, setDateCol] = useState("");
  const [valueCol, setValueCol] = useState("");
  const [periods, setPeriods] = useState(30);
  const [frequency, setFrequency] = useState<"D" | "W" | "M">("D");

  // Load column summary when dataset changes
  useEffect(() => {
    if (!selectedId) return;
    setSummary(null);
    setDateCol("");
    setValueCol("");
    analyticsApi
      .summary(selectedId)
      .then((r) => setSummary(r.data))
      .catch(() => {});
  }, [selectedId]);

  // Auto-select default columns
  useEffect(() => {
    if (!summary) return;
    const cols = summary.columns;
    const dateCandidates = cols.filter(
      (c) =>
        c.column.toLowerCase().includes("date") ||
        c.column.toLowerCase().includes("time") ||
        c.column.toLowerCase().includes("year") ||
        c.column.toLowerCase().includes("month") ||
        c.column.toLowerCase().includes("day")
    );
    if (dateCandidates.length > 0 && !dateCol) {
      setDateCol(dateCandidates[0].column);
    }

    const numericCols = cols.filter((c) => c.dtype === "numeric");
    if (numericCols.length > 0 && !valueCol) {
      const preferred = numericCols.find((c) =>
        /value|amount|price|revenue|sales|total|count|quantity/i.test(c.column)
      );
      setValueCol(preferred?.column || numericCols[0].column);
    }
  }, [summary]);

  const allColumns = summary?.columns.map((c) => c.column) || [];
  const numericColumns = summary?.columns.filter((c) => c.dtype === "numeric").map((c) => c.column) || [];

  const handleGenerate = () => {
    if (!dateCol || !valueCol) return;
    fetchForecast({
      date_column: dateCol,
      value_column: valueCol,
      periods,
      frequency,
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-black/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded bg-neutral-900 text-lime-400">
            PREDICTIVE MODELING
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Time-Series Forecasting Studio</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Predict future metric trajectories using exponential smoothing with 95% confidence bounds & narrative AI analysis.
        </p>
      </div>

      {/* Controls */}
      <div className="card p-6 mb-6 animate-fade-up">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Dataset */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider block mb-1.5 text-neutral-500">Target Dataset</label>
            {datasets.length === 0 ? (
              <p className="text-xs text-neutral-500">No ready datasets available.</p>
            ) : (
              <select
                value={selectedId || ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="input-field font-semibold text-slate-900"
              >
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.clean_row_count?.toLocaleString()} rows)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date column */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider block mb-1.5 text-neutral-500">Time Dimension Column</label>
            <select
              value={dateCol}
              onChange={(e) => setDateCol(e.target.value)}
              className="input-field font-semibold text-slate-900"
              disabled={!summary}
            >
              <option value="">— Select Date/Time Column —</option>
              {allColumns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Value column */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider block mb-1.5 text-neutral-500">Target Metric Column</label>
            <select
              value={valueCol}
              onChange={(e) => setValueCol(e.target.value)}
              className="input-field font-semibold text-slate-900"
              disabled={!summary}
            >
              <option value="">— Select Numeric Value Column —</option>
              {numericColumns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider block mb-1.5 text-neutral-500">Sampling Interval</label>
            <div className="flex gap-2">
              {([
                { value: "D", label: "Daily" },
                { value: "W", label: "Weekly" },
                { value: "M", label: "Monthly" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFrequency(value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    frequency === value
                      ? "bg-neutral-900 text-lime-400 shadow-sm"
                      : "bg-slate-50 text-slate-700 border border-black/5 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Periods slider */}
        <div className="mb-6 pt-2 border-t border-black/5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Forecast Horizon Horizon</label>
            <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">
              {periods} {frequency === "D" ? "Days" : frequency === "W" ? "Weeks" : "Months"}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={180}
            value={periods}
            onChange={(e) => setPeriods(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-neutral-900"
          />
          <div className="flex justify-between text-[10px] font-mono text-neutral-400 mt-1">
            <span>1 interval</span>
            <span>180 intervals</span>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={forecastLoading || !dateCol || !valueCol || !selectedId}
          className="btn-primary"
        >
          {forecastLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-lime-400 border-t-transparent animate-spin" />
              Computing Model...
            </span>
          ) : (
            "Run Predictive Model"
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl mb-6 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {forecastLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-900">Computing Holt-Winters exponential smoothing model & confidence bounds...</p>
        </div>
      )}

      {/* Forecast Output */}
      {forecast && !forecastLoading && (
        <>
          {/* Metrics Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-up-1">
            {[
              { label: "Historical Data Points", value: forecast.historical.length },
              { label: "Predicted Intervals", value: forecast.forecast.length },
              {
                label: "Last Historical Value",
                value:
                  forecast.historical.length > 0
                    ? forecast.historical[forecast.historical.length - 1].value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : "—",
              },
              {
                label: "Terminal Forecast Value",
                value:
                  forecast.forecast.length > 0
                    ? forecast.forecast[forecast.forecast.length - 1].value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : "—",
              },
            ].map(({ label, value }) => (
              <div key={label} className="card p-4 text-center">
                <p className="text-lg font-black text-slate-900">{value}</p>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Chart container */}
          <div className="card p-6 mb-6 animate-fade-up-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4">Trajectory & Confidence Interval Plot</h3>
            <div className="flex justify-center p-2 bg-white rounded-xl">
              <ForecastChart data={forecast} width={Math.min(850, window.innerWidth - 340)} height={400} />
            </div>
          </div>

          {/* Narrative block */}
          <div className="card p-6 animate-fade-up-3 bg-neutral-900 text-white border-neutral-900 shadow-md">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-lime-400 text-neutral-900 flex items-center justify-center font-black shrink-0">
                ∿
              </div>
              <div className="flex-1">
                <p className="text-xs font-extrabold uppercase tracking-widest text-lime-400 mb-1">Forecast Narrative & Trend Synthesis</p>
                <p className="text-xs leading-relaxed text-neutral-200">{forecast.summary}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!forecast && !forecastLoading && (
        <div className="card p-12 text-center flex flex-col items-center border-dashed border-2">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-900">Time-Series Forecast Engine Ready</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm">
            Select a date/time dimension column and a numeric value metric above to calculate future trends.
          </p>
        </div>
      )}
    </div>
  );
}
