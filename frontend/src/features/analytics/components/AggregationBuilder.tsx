import { useState } from "react";
import {
  AggregateResponse,
  MetricSpec,
} from "@/features/analytics/services/analyticsApi";

const AGG_FUNCTIONS = ["sum", "mean", "median", "min", "max", "count", "nunique"] as const;

interface Props {
  columns: string[];
  numericColumns: string[];
  onRun: (req: { group_by: string[]; metrics: MetricSpec[] }) => void;
  result: AggregateResponse | null;
  loading: boolean;
}

export function AggregationBuilder({ columns, numericColumns, onRun, result, loading }: Props) {
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<MetricSpec[]>([
    { column: numericColumns[0] || columns[0] || "", function: "sum" },
  ]);

  const addMetric = () => {
    setMetrics((prev) => [
      ...prev,
      { column: numericColumns[0] || columns[0] || "", function: "sum" },
    ]);
  };

  const removeMetric = (i: number) => {
    setMetrics((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateMetric = (i: number, field: "column" | "function", value: string) => {
    setMetrics((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  };

  const toggleGroupBy = (col: string) => {
    setGroupBy((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
  };

  const handleRun = () => {
    if (metrics.length === 0) return;
    onRun({ group_by: groupBy, metrics });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Group By */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>
          Group By
        </p>
        <div className="flex flex-wrap gap-1.5">
          {columns.map((col) => (
            <button
              key={col}
              onClick={() => toggleGroupBy(col)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: groupBy.includes(col) ? "var(--ink)" : "var(--surface)",
                color: groupBy.includes(col) ? "var(--accent)" : "var(--ink)",
                border: groupBy.includes(col) ? "1.5px solid var(--ink)" : "1.5px solid var(--border)",
              }}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
            Metrics
          </p>
          <button onClick={addMetric} className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all" style={{ background: "var(--surface)", color: "var(--ink)", border: "1.5px solid var(--border)" }}>
            + Add
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={m.function}
                onChange={(e) => updateMetric(i, "function", e.target.value)}
                className="input-field !py-2 !text-xs"
                style={{ maxWidth: 130 }}
              >
                {AGG_FUNCTIONS.map((fn) => (
                  <option key={fn} value={fn}>{fn.toUpperCase()}</option>
                ))}
              </select>
              <select
                value={m.column}
                onChange={(e) => updateMetric(i, "column", e.target.value)}
                className="input-field !py-2 !text-xs flex-1"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              {metrics.length > 1 && (
                <button onClick={() => removeMetric(i)} className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:bg-red-50" style={{ color: "var(--danger)" }}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Run button */}
      <button onClick={handleRun} disabled={loading || metrics.length === 0} className="btn-primary self-start">
        {loading ? "Running…" : "Run Aggregation"}
      </button>

      {/* Results table */}
      {result && result.rows.length > 0 && (
        <div className="overflow-auto rounded-xl" style={{ border: "1.5px solid var(--border)" }}>
          <table className="w-full text-xs border-collapse min-w-max">
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                {result.columns.map((col) => (
                  <th key={col} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap" style={{ color: "var(--ink)", borderBottom: "1.5px solid var(--border)" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }} className="transition-colors hover:bg-gray-50">
                  {result.columns.map((col) => (
                    <td key={col} className="px-3 py-2 whitespace-nowrap font-mono" style={{ color: "var(--ink)" }}>
                      {row[col] === null || row[col] === undefined ? (
                        <span style={{ color: "var(--muted)", fontStyle: "italic" }}>null</span>
                      ) : typeof row[col] === "number" ? (
                        Number(row[col]).toLocaleString(undefined, { maximumFractionDigits: 4 })
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 text-xs" style={{ color: "var(--muted)", background: "var(--surface)" }}>
            {result.total_rows} row{result.total_rows !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {result && result.rows.length === 0 && (
        <div className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>
          No results — try changing the group-by columns or metrics.
        </div>
      )}
    </div>
  );
}
