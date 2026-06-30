import { useState, useRef, useEffect } from "react";
import { useIntelligence } from "@/features/intelligence/hooks/useIntelligence";
import { MiniChart } from "./MiniChart";
import type { NLQueryResponse } from "@/features/intelligence/services/intelligenceApi";

const EXAMPLE_QUESTIONS = [
  "What is the total revenue by category?",
  "Show me a bar chart of the top 10 items",
  "What is the average price?",
  "How many records are there per region?",
  "Show the distribution of values",
];

function QueryResultCard({ result }: { result: NLQueryResponse }) {
  const [showConfig, setShowConfig] = useState(false);
  const queryType = result.generated_query.query_type;
  const data = result.result;

  return (
    <div className="card p-5 animate-fade-up">
      {/* Question */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: "rgba(99,102,241,0.10)", color: "#6366f1" }}>
          ⌘
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{result.question}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{result.generated_query.explanation}</p>
        </div>
      </div>

      {/* Generated config toggle */}
      <button
        onClick={() => setShowConfig(!showConfig)}
        className="text-xs font-semibold mb-3 flex items-center gap-1 transition-colors"
        style={{ color: "var(--muted)" }}
      >
        <span style={{ transform: showConfig ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▸</span>
        Query config ({queryType})
      </button>
      {showConfig && (
        <pre
          className="text-xs p-3 rounded-lg mb-4 overflow-auto"
          style={{ background: "var(--ink)", color: "var(--accent)", fontFamily: "'Geist Mono', monospace", maxHeight: 200 }}
        >
          {JSON.stringify(result.generated_query.config, null, 2)}
        </pre>
      )}

      {/* Result rendering */}
      {queryType === "aggregate" && data.rows && (
        <div className="overflow-auto rounded-lg" style={{ border: "1.5px solid var(--border)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                {(data.columns as string[] || []).map((col: string) => (
                  <th key={col} className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--ink)" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.rows as Record<string, any>[]).slice(0, 20).map((row: Record<string, any>, i: number) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  {(data.columns as string[] || []).map((col: string) => (
                    <td key={col} className="px-3 py-2" style={{ color: "var(--ink)" }}>
                      {typeof row[col] === "number" ? row[col].toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(row[col] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {(data.rows as any[]).length > 20 && (
            <p className="text-xs text-center py-2" style={{ color: "var(--muted)" }}>
              Showing 20 of {(data.rows as any[]).length} rows
            </p>
          )}
        </div>
      )}

      {queryType === "chart" && data.labels && (
        <MiniChart
          data={{
            chart_type: data.chart_type as string,
            labels: data.labels as any[],
            series: (data.series as { name: string; data: any[] }[]) || [],
          }}
          width={Math.min(520, window.innerWidth - 380)}
          height={280}
        />
      )}
    </div>
  );
}

export default function NLQueryPage() {
  const {
    datasets, selectedId, setSelectedId,
    nlLoading, nlHistory, askQuestion,
    error,
  } = useIntelligence();

  const [question, setQuestion] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || nlLoading) return;
    askQuestion(question.trim());
    setQuestion("");
  };

  const handleExample = (q: string) => {
    setQuestion(q);
    inputRef.current?.focus();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Phase 4</p>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>Natural Language Query</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Ask questions about your data in plain English. AI translates them into analytics queries.</p>
      </div>

      {/* Dataset selector */}
      <div className="card p-5 mb-6 animate-fade-up">
        <div className="flex items-center gap-4">
          <label className="text-xs font-semibold tracking-widest uppercase shrink-0" style={{ color: "var(--muted)" }}>Dataset</label>
          {datasets.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>No ready datasets available.</p>
          ) : (
            <select
              value={selectedId || ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="input-field !py-2 !text-sm"
              style={{ maxWidth: 400 }}
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.clean_row_count?.toLocaleString()} rows)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Query input */}
      <form onSubmit={handleSubmit} className="card p-5 mb-6 animate-fade-up-1">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask your data a question…"
              className="input-field !py-3 !pr-4 !pl-10 !text-sm"
              disabled={nlLoading || !selectedId}
              maxLength={500}
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base" style={{ color: "var(--muted)" }}>⌘</span>
          </div>
          <button
            type="submit"
            disabled={nlLoading || !question.trim() || !selectedId}
            className="btn-primary !py-3 shrink-0"
          >
            {nlLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                Thinking…
              </span>
            ) : (
              "Ask"
            )}
          </button>
        </div>

        {/* Example questions */}
        {nlHistory.length === 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>Try an example:</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleExample(q)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105"
                  style={{ background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--border)" }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Error */}
      {error && (
        <div className="card p-4 mb-6 animate-fade-up" style={{ background: "rgba(240,77,77,0.06)", borderColor: "rgba(240,77,77,0.2)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {nlLoading && (
        <div className="card p-6 mb-6 animate-fade-up">
          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10 shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--ink)", borderTopColor: "transparent" }} />
              <div className="absolute inset-2 rounded-full border-2 border-b-transparent animate-spin" style={{ borderColor: "var(--accent)", borderBottomColor: "transparent", animationDirection: "reverse", animationDuration: "0.8s" }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>Interpreting your question…</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>AI is translating your question into an analytics query</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {nlHistory.map((result, i) => (
          <QueryResultCard key={`${result.question}-${i}`} result={result} />
        ))}
      </div>

      {/* Empty state */}
      {nlHistory.length === 0 && !nlLoading && (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-up-2" style={{ color: "var(--muted)" }}>
          <span className="text-5xl mb-4">⌘</span>
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Ask anything about your data</p>
          <p className="text-xs mt-1 text-center max-w-sm">
            Your questions are translated into aggregation or chart queries and executed instantly. Results appear right here.
          </p>
        </div>
      )}
    </div>
  );
}
