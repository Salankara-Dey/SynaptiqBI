import { useState, useRef, useEffect } from "react";
import { useIntelligence } from "@/features/intelligence/hooks/useIntelligence";
import { MiniChart } from "./MiniChart";
import type { NLQueryResponse } from "@/features/intelligence/services/intelligenceApi";

const EXAMPLE_QUESTIONS = [
  "What is the total revenue grouped by category?",
  "Show me a bar chart of top 10 items",
  "What is the overall average metric value?",
  "How many records exist per geographic region?",
  "Display the frequency distribution of values",
];

function QueryResultCard({ result }: { result: NLQueryResponse }) {
  const [showConfig, setShowConfig] = useState(false);
  const queryType = result.generated_query.query_type;
  const data = result.result;

  return (
    <div className="card p-6 animate-fade-up">
      {/* Question Header */}
      <div className="flex items-start gap-3.5 mb-4">
        <div className="w-9 h-9 rounded-lg bg-neutral-900 text-lime-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
          NL
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">{result.question}</p>
          <p className="text-xs text-neutral-500 mt-0.5">{result.generated_query.explanation}</p>
        </div>
      </div>

      {/* Generated Query Inspector Toggle */}
      <button
        onClick={() => setShowConfig(!showConfig)}
        className="text-[11px] font-bold text-neutral-500 hover:text-slate-900 mb-3 flex items-center gap-1.5 transition-colors uppercase tracking-wider"
      >
        <span className={`transition-transform duration-200 ${showConfig ? "rotate-90" : ""}`}>▸</span>
        Generated Query Spec ({queryType})
      </button>
      {showConfig && (
        <pre className="text-xs p-3.5 rounded-xl mb-4 overflow-auto bg-neutral-900 text-lime-400 font-mono max-h-48 border border-neutral-800">
          {JSON.stringify(result.generated_query.config, null, 2)}
        </pre>
      )}

      {/* Result Output */}
      {queryType === "aggregate" && data.rows && (
        <div className="overflow-auto rounded-xl border border-black/10 bg-slate-50/50">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-black/5 text-slate-700">
                {(data.columns as string[] || []).map((col: string) => (
                  <th key={col} className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {(data.rows as Record<string, any>[]).slice(0, 20).map((row: Record<string, any>, i: number) => (
                <tr key={i} className="hover:bg-white transition-colors">
                  {(data.columns as string[] || []).map((col: string) => (
                    <td key={col} className="px-4 py-2.5 font-medium text-slate-800">
                      {typeof row[col] === "number" ? row[col].toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(row[col] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {(data.rows as any[]).length > 20 && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-center py-2 text-neutral-400 bg-slate-100 border-t border-black/5">
              Truncated view — showing 20 of {(data.rows as any[]).length} rows
            </p>
          )}
        </div>
      )}

      {queryType === "chart" && data.labels && (
        <div className="flex justify-center p-3 bg-white rounded-xl border border-black/5">
          <MiniChart
            data={{
              chart_type: data.chart_type as string,
              labels: data.labels as any[],
              series: (data.series as { name: string; data: any[] }[]) || [],
            }}
            width={Math.min(600, window.innerWidth - 380)}
            height={280}
          />
        </div>
      )}
    </div>
  );
}

export default function NLQueryPage() {
  const { datasets, selectedId, setSelectedId, nlLoading, nlHistory, askQuestion, error } = useIntelligence();

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
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-black/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded bg-neutral-900 text-lime-400">
            NATURAL LANGUAGE QUERY
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Conversational Data Query Engine</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Ask complex analytical questions in natural English. AI translates prompts into analytical SQL/aggregation specs.
        </p>
      </div>

      {/* Dataset selector */}
      <div className="card p-5 mb-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 shrink-0">Active Context Dataset</label>
          {datasets.length === 0 ? (
            <p className="text-xs text-neutral-500">No ready datasets available.</p>
          ) : (
            <select
              value={selectedId || ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="input-field max-w-md font-semibold text-slate-900"
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

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="card p-5 mb-8 animate-fade-up-1">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask any analytical question about your dataset (e.g. 'Show total sales by region')..."
              className="input-field !py-3 font-semibold text-slate-900"
              disabled={nlLoading || !selectedId}
              maxLength={500}
            />
          </div>
          <button type="submit" disabled={nlLoading || !question.trim() || !selectedId} className="btn-primary shrink-0">
            {nlLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-lime-400 border-t-transparent animate-spin" />
                Interpreting...
              </span>
            ) : (
              "Ask Data"
            )}
          </button>
        </div>

        {/* Quick prompt suggestions */}
        {nlHistory.length === 0 && (
          <div className="mt-4 pt-3 border-t border-black/5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 mb-2">Suggested Queries</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleExample(q)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-50 border border-black/5 hover:border-black/20 hover:bg-slate-100 text-slate-800 transition-all"
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
        <div className="p-4 rounded-xl mb-6 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {nlLoading && (
        <div className="card p-6 mb-6 animate-fade-up">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">Translating natural language into aggregate query specification...</p>
              <p className="text-[11px] text-neutral-500">LLM model is validating schema & compiling execution payload</p>
            </div>
          </div>
        </div>
      )}

      {/* Results history */}
      <div className="space-y-4">
        {nlHistory.map((result, i) => (
          <QueryResultCard key={`${result.question}-${i}`} result={result} />
        ))}
      </div>

      {/* Empty state */}
      {nlHistory.length === 0 && !nlLoading && (
        <div className="card p-12 text-center flex flex-col items-center border-dashed border-2">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-900">Conversational Query Interface Ready</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm">
            Enter a prompt above to generate grouped aggregations or instant visual charts from your active dataset.
          </p>
        </div>
      )}
    </div>
  );
}
