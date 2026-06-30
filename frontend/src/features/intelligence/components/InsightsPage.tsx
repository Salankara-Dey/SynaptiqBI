import { useState } from "react";
import { useIntelligence } from "@/features/intelligence/hooks/useIntelligence";
import type { Insight } from "@/features/intelligence/services/intelligenceApi";

const CATEGORY_STYLES: Record<string, { bg: string; color: string; icon: string }> = {
  trend:           { bg: "rgba(99,102,241,0.10)",  color: "#6366f1", icon: "↗" },
  anomaly:         { bg: "rgba(239,68,68,0.10)",   color: "#ef4444", icon: "⚡" },
  correlation:     { bg: "rgba(16,185,129,0.10)",  color: "#10b981", icon: "⬡" },
  distribution:    { bg: "rgba(245,158,11,0.10)",  color: "#f59e0b", icon: "◓" },
  recommendation:  { bg: "rgba(139,92,246,0.10)",  color: "#8b5cf6", icon: "◈" },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-semibold" style={{ color }}>{pct}%</span>
    </div>
  );
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const style = CATEGORY_STYLES[insight.category] || CATEGORY_STYLES.trend;
  return (
    <div
      className="card p-5 animate-fade-up hover:shadow-md transition-shadow duration-200"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ background: style.bg, color: style.color }}
        >
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{insight.title}</h3>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: style.bg, color: style.color }}
            >
              {insight.category}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{insight.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <ConfidenceBar value={insight.confidence} />
        </div>
        {insight.affected_columns.length > 0 && (
          <div className="flex gap-1 shrink-0">
            {insight.affected_columns.slice(0, 3).map((col) => (
              <span key={col} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--ink)" }}>
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
  const {
    datasets, selectedId, setSelectedId,
    insights, insightsLoading, fetchInsights,
    error,
  } = useIntelligence();

  const [maxInsights, setMaxInsights] = useState(5);

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Phase 4</p>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>AI Insights</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>AI-powered analysis of your dataset — patterns, anomalies, and recommendations.</p>
      </div>

      {/* Controls */}
      <div className="card p-5 mb-6 animate-fade-up">
        <div className="flex flex-wrap items-end gap-4">
          {/* Dataset selector */}
          <div className="flex-1" style={{ minWidth: 200 }}>
            <label className="text-xs font-semibold tracking-widest uppercase block mb-1.5" style={{ color: "var(--muted)" }}>Dataset</label>
            {datasets.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>No ready datasets. Upload and process a dataset first.</p>
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

          {/* Max insights */}
          <div>
            <label className="text-xs font-semibold tracking-widest uppercase block mb-1.5" style={{ color: "var(--muted)" }}>Max Insights</label>
            <select
              value={maxInsights}
              onChange={(e) => setMaxInsights(Number(e.target.value))}
              className="input-field !py-2 !text-sm"
              style={{ width: 80 }}
            >
              {[3, 5, 7, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchInsights(maxInsights)}
            disabled={insightsLoading || !selectedId}
            className="btn-primary !py-2.5"
          >
            {insightsLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                Analyzing…
              </span>
            ) : (
              "◎ Generate Insights"
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 mb-6 animate-fade-up" style={{ background: "rgba(240,77,77,0.06)", borderColor: "rgba(240,77,77,0.2)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {insightsLoading && (
        <div className="flex items-center justify-center py-20" style={{ color: "var(--muted)" }}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--ink)", borderTopColor: "transparent" }} />
              <div className="absolute inset-2 rounded-full border-2 border-b-transparent animate-spin" style={{ borderColor: "var(--accent)", borderBottomColor: "transparent", animationDirection: "reverse", animationDuration: "0.8s" }} />
            </div>
            <p className="text-sm font-semibold">Analyzing your dataset with AI…</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Results */}
      {insights && !insightsLoading && (
        <>
          {/* Summary */}
          <div className="card p-5 mb-6 animate-fade-up" style={{ background: "var(--ink)", borderColor: "var(--ink)" }}>
            <div className="flex items-start gap-3">
              <span className="text-xl">◎</span>
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: "var(--accent)" }}>Analysis Summary</p>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{insights.summary}</p>
                {insights.token_usage > 0 && (
                  <p className="text-xs mt-2 font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                    ~{insights.token_usage} tokens used
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-up-1">
            {[
              { label: "Insights", value: insights.insights.length, icon: "◎" },
              {
                label: "Avg Confidence",
                value: insights.insights.length > 0
                  ? `${Math.round((insights.insights.reduce((a, i) => a + i.confidence, 0) / insights.insights.length) * 100)}%`
                  : "—",
                icon: "◈",
              },
              {
                label: "Categories",
                value: new Set(insights.insights.map((i) => i.category)).size,
                icon: "⊡",
              },
            ].map(({ label, value, icon }) => (
              <div key={label} className="card p-4 text-center">
                <span className="text-lg block mb-1" style={{ color: "var(--muted)" }}>{icon}</span>
                <p className="text-xl font-black" style={{ color: "var(--ink)" }}>{value}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--muted)" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Insight cards */}
          <div className="space-y-3">
            {insights.insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} index={i} />
            ))}
          </div>

          {insights.insights.length === 0 && (
            <div className="card p-8 text-center animate-fade-up">
              <span className="text-4xl block mb-3">◎</span>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>No insights generated</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>The dataset may not contain enough variation for meaningful insights.</p>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!insights && !insightsLoading && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-up" style={{ color: "var(--muted)" }}>
          <span className="text-5xl mb-4">◎</span>
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Ready to analyze</p>
          <p className="text-xs mt-1 text-center max-w-sm">
            Select a dataset and click "Generate Insights" to get AI-powered analysis of patterns, anomalies, and recommendations.
          </p>
        </div>
      )}
    </div>
  );
}
