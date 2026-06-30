import { useState, useEffect } from "react";
import { useIntelligence } from "@/features/intelligence/hooks/useIntelligence";
import { ForecastChart } from "./ForecastChart";
import { analyticsApi, SummaryResponse } from "@/features/analytics/services/analyticsApi";

export default function ForecastPage() {
  const {
    datasets, selectedId, setSelectedId,
    forecast, forecastLoading, fetchForecast,
    error,
  } = useIntelligence();

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
    // Look for a date-like column (categorical columns with "date" or "time" in name, or that may have been coerced)
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
      // Prefer columns with "value", "amount", "price", "revenue", "sales"
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
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Phase 4</p>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>Forecasting</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Time-series forecasting powered by exponential smoothing with AI-generated narrative.</p>
      </div>

      {/* Controls */}
      <div className="card p-5 mb-6 animate-fade-up">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Dataset */}
          <div>
            <label className="text-xs font-semibold tracking-widest uppercase block mb-1.5" style={{ color: "var(--muted)" }}>Dataset</label>
            {datasets.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>No ready datasets.</p>
            ) : (
              <select
                value={selectedId || ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="input-field !py-2 !text-sm"
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
            <label className="text-xs font-semibold tracking-widest uppercase block mb-1.5" style={{ color: "var(--muted)" }}>Date Column</label>
            <select
              value={dateCol}
              onChange={(e) => setDateCol(e.target.value)}
              className="input-field !py-2 !text-sm"
              disabled={!summary}
            >
              <option value="">— select —</option>
              {allColumns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Value column */}
          <div>
            <label className="text-xs font-semibold tracking-widest uppercase block mb-1.5" style={{ color: "var(--muted)" }}>Value Column</label>
            <select
              value={valueCol}
              onChange={(e) => setValueCol(e.target.value)}
              className="input-field !py-2 !text-sm"
              disabled={!summary}
            >
              <option value="">— select —</option>
              {numericColumns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-xs font-semibold tracking-widest uppercase block mb-1.5" style={{ color: "var(--muted)" }}>Frequency</label>
            <div className="flex gap-1">
              {([
                { value: "D", label: "Daily" },
                { value: "W", label: "Weekly" },
                { value: "M", label: "Monthly" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFrequency(value)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: frequency === value ? "var(--ink)" : "var(--surface)",
                    color: frequency === value ? "var(--accent)" : "var(--ink)",
                    border: frequency === value ? "1.5px solid var(--ink)" : "1.5px solid var(--border)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Periods slider */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>Forecast Periods</label>
            <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>{periods}</span>
          </div>
          <input
            type="range"
            min={1}
            max={365}
            value={periods}
            onChange={(e) => setPeriods(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, var(--ink) ${(periods / 365) * 100}%, var(--border) 0%)` }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: "var(--muted)" }}>
            <span>1</span>
            <span>365</span>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={forecastLoading || !dateCol || !valueCol || !selectedId}
          className="btn-primary !py-2.5"
        >
          {forecastLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              Computing…
            </span>
          ) : (
            "∿ Generate Forecast"
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 mb-6 animate-fade-up" style={{ background: "rgba(240,77,77,0.06)", borderColor: "rgba(240,77,77,0.2)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {forecastLoading && (
        <div className="flex items-center justify-center py-20" style={{ color: "var(--muted)" }}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--ink)", borderTopColor: "transparent" }} />
              <div className="absolute inset-2 rounded-full border-2 border-b-transparent animate-spin" style={{ borderColor: "var(--accent)", borderBottomColor: "transparent", animationDirection: "reverse", animationDuration: "0.8s" }} />
            </div>
            <p className="text-sm font-semibold">Running exponential smoothing…</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Computing forecast with confidence intervals</p>
          </div>
        </div>
      )}

      {/* Results */}
      {forecast && !forecastLoading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-fade-up-1">
            {[
              { label: "Historical Points", value: forecast.historical.length, icon: "⊞" },
              { label: "Forecast Points", value: forecast.forecast.length, icon: "∿" },
              {
                label: "Last Actual",
                value: forecast.historical.length > 0
                  ? forecast.historical[forecast.historical.length - 1].value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : "—",
                icon: "◈",
              },
              {
                label: "End Forecast",
                value: forecast.forecast.length > 0
                  ? forecast.forecast[forecast.forecast.length - 1].value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : "—",
                icon: "◎",
              },
            ].map(({ label, value, icon }) => (
              <div key={label} className="card p-4 text-center">
                <span className="text-lg block mb-1" style={{ color: "var(--muted)" }}>{icon}</span>
                <p className="text-lg font-black" style={{ color: "var(--ink)" }}>{value}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--muted)" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="mb-6 animate-fade-up-2">
            <ForecastChart
              data={forecast}
              width={Math.min(780, window.innerWidth - 320)}
              height={400}
            />
          </div>

          {/* AI Summary */}
          <div className="card p-5 animate-fade-up-3" style={{ background: "var(--ink)", borderColor: "var(--ink)" }}>
            <div className="flex items-start gap-3">
              <span className="text-xl">∿</span>
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: "var(--accent)" }}>Forecast Summary</p>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{forecast.summary}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!forecast && !forecastLoading && (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-up" style={{ color: "var(--muted)" }}>
          <span className="text-5xl mb-4">∿</span>
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Ready to forecast</p>
          <p className="text-xs mt-1 text-center max-w-sm">
            Select a date column and a numeric value column, then generate a time-series forecast with confidence intervals.
          </p>
        </div>
      )}
    </div>
  );
}
