import { useState } from "react";
import { useIntelligence } from "@/features/intelligence/hooks/useIntelligence";
import type { Insight } from "@/features/intelligence/services/intelligenceApi";

const CATEGORY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  trend: { bg: "rgba(59,130,246,0.1)", color: "#2563eb", border: "rgba(59,130,246,0.2)" },
  anomaly: { bg: "rgba(239,68,68,0.1)", color: "#dc2626", border: "rgba(239,68,68,0.2)" },
  correlation: { bg: "rgba(16,185,129,0.1)", color: "#059669", border: "rgba(16,185,129,0.2)" },
  distribution: { bg: "rgba(245,158,11,0.1)", color: "#d97706", border: "rgba(245,158,11,0.2)" },
  recommendation: { bg: "rgba(139,92,246,0.1)", color: "#7c3aed", border: "rgba(139,92,246,0.2)" },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase text-neutral-400">Confidence</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100 border border-black/5">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const style = CATEGORY_STYLES[insight.category] || CATEGORY_STYLES.trend;
  return (
    <div
      className="card-interactive p-5 animate-fade-up flex flex-col justify-between"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-sm font-bold text-slate-900">{insight.title}</h3>
          <span
            className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 border"
            style={{ background: style.bg, color: style.color, borderColor: style.border }}
          >
            {insight.category}
          </span>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed mb-4">{insight.description}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-black/5">
        <div className="flex-1 max-w-xs">
          <ConfidenceBar value={insight.confidence} />
        </div>
        {insight.affected_columns.length > 0 && (
          <div className="flex gap-1 shrink-0">
            {insight.affected_columns.slice(0, 3).map((col) => (
              <span key={col} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-black/5">
                {col}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { datasets, selectedId, setSelectedId, insights, insightsLoading, fetchInsights, error } = useIntelligence();

  const [maxInsights, setMaxInsights] = useState(5);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-black/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded bg-neutral-900 text-lime-400">
            AUTOMATED DISCOVERY
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">AI Insights & Pattern Engine</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Automated statistical pattern discovery, anomaly detection, data quality metrics, and structured AI recommendations.
        </p>
      </div>

      {/* Control bar */}
      <div className="card p-5 mb-6 animate-fade-up">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className="text-[10px] font-extrabold uppercase tracking-wider block mb-1.5 text-neutral-500">Target Dataset</label>
            {datasets.length === 0 ? (
              <p className="text-xs text-neutral-500">No ready datasets. Upload a dataset first.</p>
            ) : (
              <select
                value={selectedId || ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="input-field font-semibold text-slate-900"
              >
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.clean_row_count?.toLocaleString()} clean rows)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider block mb-1.5 text-neutral-500">Max Insights</label>
            <select
              value={maxInsights}
              onChange={(e) => setMaxInsights(Number(e.target.value))}
              className="input-field font-semibold text-slate-900"
              style={{ width: 90 }}
            >
              {[3, 5, 7, 10].map((n) => (
                <option key={n} value={n}>
                  {n} items
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchInsights(maxInsights)}
            disabled={insightsLoading || !selectedId}
            className="btn-primary"
          >
            {insightsLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-lime-400 border-t-transparent animate-spin" />
                Analyzing...
              </span>
            ) : (
              "Generate Insights"
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl mb-6 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {insightsLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-900">Executing statistical pattern analysis with LLM inference...</p>
        </div>
      )}

      {/* Results */}
      {insights && !insightsLoading && (
        <>
          {/* Executive summary block */}
          <div className="card p-6 mb-6 animate-fade-up bg-neutral-900 text-white border-neutral-900 shadow-md">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-lime-400 text-neutral-900 flex items-center justify-center font-black shrink-0">
                AI
              </div>
              <div className="flex-1">
                <p className="text-xs font-extrabold uppercase tracking-widest text-lime-400 mb-1">Executive AI Summary</p>
                <p className="text-xs leading-relaxed text-neutral-200">{insights.summary}</p>
                {insights.token_usage > 0 && (
                  <p className="text-[10px] font-mono text-neutral-400 mt-2">
                    Inference token count: ~{insights.token_usage} tokens
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats overview */}
          <div className="grid grid-cols-3 gap-4 mb-6 animate-fade-up-1">
            {[
              { label: "Insights Discovered", value: insights.insights.length },
              {
                label: "Average Confidence",
                value:
                  insights.insights.length > 0
                    ? `${Math.round((insights.insights.reduce((a, i) => a + i.confidence, 0) / insights.insights.length) * 100)}%`
                    : "—",
              },
              {
                label: "Categories Flagged",
                value: new Set(insights.insights.map((i) => i.category)).size,
              },
            ].map(({ label, value }) => (
              <div key={label} className="card p-4 text-center">
                <p className="text-xl font-black text-slate-900">{value}</p>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} index={i} />
            ))}
          </div>

          {insights.insights.length === 0 && (
            <div className="card p-12 text-center text-xs font-bold text-neutral-500">
              No anomalies or significant patterns detected in the current sample.
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!insights && !insightsLoading && (
        <div className="card p-12 text-center flex flex-col items-center border-dashed border-2">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-900">Ready to execute AI discovery</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm">
            Select a target dataset above and click "Generate Insights" to run automated LLM pattern extraction.
          </p>
        </div>
      )}
    </div>
  );
}
