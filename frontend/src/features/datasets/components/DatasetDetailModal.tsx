import { useEffect, useState } from "react";
import { datasetsApi, Dataset } from "@/features/datasets/services/datasetsApi";

interface Props { datasetId: string; onClose: () => void; }
const TABS = ["Overview", "Profile", "Data Preview"] as const;
type Tab = typeof TABS[number];

function fmtDtype(t: string) {
  if (t.includes("int") || t.includes("float")) return "Numeric";
  if (t.includes("datetime")) return "Datetime";
  if (t === "numeric") return "Numeric";
  if (t === "datetime") return "Datetime";
  return "Text";
}
const DTYPE_COLOR: Record<string, string> = { Numeric: "rgba(79,110,247,0.12)", Datetime: "rgba(200,240,77,0.15)", Text: "rgba(138,137,144,0.12)" };
const DTYPE_TEXT: Record<string, string> = { Numeric: "#3b55e6", Datetime: "#6a8a00", Text: "var(--muted)" };

export function DatasetDetailModal({ datasetId, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [ds, setDs] = useState<Dataset | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  useEffect(() => { datasetsApi.get(datasetId).then((r) => setDs(r.data)); }, [datasetId]);

  useEffect(() => {
    if (tab === "Data Preview" && ds?.status === "ready" && rows.length === 0) {
      setLoadingRows(true);
      datasetsApi.rows(datasetId, 50).then((r) => { setRows(r.data.rows); setLoadingRows(false); });
    }
  }, [tab, ds, datasetId, rows.length]);

  if (!ds) {
    return <Backdrop onClose={onClose}><div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--muted)" }}>Loading…</div></Backdrop>;
  }

  const profile = ds.profile ?? {};
  const colTypes = ds.column_types ?? {};
  const columns = Object.keys(profile);
  const previewCols = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h2 className="text-lg font-extrabold" style={{ color: "var(--ink)" }}>{ds.name}</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {ds.clean_row_count?.toLocaleString()} clean rows · {columns.length} columns · {ds.original_filename}
          </p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-all hover:bg-gray-100" style={{ color: "var(--muted)" }}>×</button>
      </div>

      <div className="flex gap-1 px-6 mt-5 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-2.5 text-xs font-semibold transition-all"
            style={{ color: tab === t ? "var(--ink)" : "var(--muted)", borderBottom: tab === t ? "2px solid var(--ink)" : "2px solid transparent", marginBottom: "-1px" }}>
            {t}
          </button>
        ))}
      </div>

      <div className="p-6 overflow-auto flex-1">
        {tab === "Overview" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ["Raw Rows", ds.raw_row_count?.toLocaleString() ?? "—"],
                ["Clean Rows", ds.clean_row_count?.toLocaleString() ?? "—"],
                ["Columns", columns.length],
                ["File Size", `${(ds.file_size_bytes / 1024).toFixed(1)} KB`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl p-4 text-center" style={{ background: "var(--surface)" }}>
                  <p className="text-xl font-black" style={{ color: "var(--ink)" }}>{value}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{label}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--muted)" }}>Column Types</p>
              <div className="flex flex-wrap gap-2">
                {columns.map((col) => {
                  const dtype = fmtDtype(colTypes[col] ?? "object");
                  return <span key={col} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: DTYPE_COLOR[dtype], color: DTYPE_TEXT[dtype] }}>{col} · {dtype}</span>;
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "Profile" && (
          <div className="flex flex-col gap-3">
            {columns.map((col) => {
              const p = profile[col];
              const dtype = fmtDtype(colTypes[col] ?? "object");
              return (
                <div key={col} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{col}</p>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: DTYPE_COLOR[dtype], color: DTYPE_TEXT[dtype] }}>{dtype}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      ["Nulls", p.null_count],
                      ["Unique", p.unique_count],
                      ...(p.mean !== undefined ? [["Mean", typeof p.mean === "number" ? p.mean.toFixed(2) : p.mean], ["Std", typeof p.std === "number" ? p.std.toFixed(2) : p.std]] : []),
                      ...(p.top_values ? [["Top", Object.keys(p.top_values)[0] ?? "—"]] : []),
                    ].map(([lbl, val]) => (
                      <div key={lbl} className="text-center p-2 rounded-lg" style={{ background: "var(--surface)" }}>
                        <p className="text-xs font-bold truncate" style={{ color: "var(--ink)" }}>{val ?? "—"}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{lbl}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "Data Preview" && (
          loadingRows ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: "var(--muted)" }}>Loading rows…</div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: "var(--muted)" }}>No rows available</div>
          ) : (
            <div className="overflow-auto rounded-xl" style={{ border: "1.5px solid var(--border)" }}>
              <table className="w-full text-xs border-collapse min-w-max">
                <thead>
                  <tr style={{ background: "var(--surface-2)" }}>
                    <th className="px-3 py-2.5 text-left font-semibold sticky left-0" style={{ color: "var(--muted)", background: "var(--surface-2)", borderBottom: "1.5px solid var(--border)" }}>#</th>
                    {previewCols.map((col) => (
                      <th key={col} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap" style={{ color: "var(--ink)", borderBottom: "1.5px solid var(--border)" }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }} className="transition-colors hover:bg-gray-50">
                      <td className="px-3 py-2 sticky left-0 font-mono" style={{ color: "var(--muted)", background: "white" }}>{i + 1}</td>
                      {previewCols.map((col) => (
                        <td key={col} className="px-3 py-2 whitespace-nowrap font-mono" style={{ color: "var(--ink)" }}>
                          {row[col] === null || row[col] === undefined ? <span style={{ color: "var(--muted)", fontStyle: "italic" }}>null</span> : String(row[col]).slice(0, 60)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </Backdrop>
  );
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: "rgba(10,10,15,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden animate-fade-up" style={{ background: "white", boxShadow: "0 32px 80px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
