import { Dataset } from "@/features/datasets/services/datasetsApi";

interface DatasetCardProps { dataset: Dataset; onDelete: (id: string) => void; onClick: (id: string) => void; }

const STATUS_CONFIG = {
  pending: { label: "Pending",    dot: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  running: { label: "Processing", dot: "#4f6ef7", bg: "rgba(79,110,247,0.10)" },
  ready:   { label: "Ready",      dot: "#4dcf7f", bg: "rgba(77,207,127,0.10)" },
  failed:  { label: "Failed",     dot: "#f04d4d", bg: "rgba(240,77,77,0.10)" },
};

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function DatasetCard({ dataset: ds, onDelete, onClick }: DatasetCardProps) {
  const cfg = STATUS_CONFIG[ds.status];
  const isProcessing = ds.status === "pending" || ds.status === "running";

  return (
    <div className="card p-5 flex flex-col gap-4 cursor-pointer transition-all duration-150 hover:shadow-sm"
      style={{ borderColor: ds.status === "ready" ? "rgba(10,10,15,0.10)" : cfg.bg }}
      onClick={() => ds.status === "ready" && onClick(ds.id)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black shrink-0" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
            {ds.original_filename.split(".").pop()?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{ds.name}</p>
            <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{ds.original_filename}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 text-xs font-semibold" style={{ background: cfg.bg }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot, animation: isProcessing ? "pulse-dot 1.2s ease-in-out infinite" : "none" }} />
          <span style={{ color: cfg.dot }}>{cfg.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["Rows", ds.status === "ready" ? ds.clean_row_count?.toLocaleString() : ds.raw_row_count?.toLocaleString() ?? "—"],
          ["Cols", ds.raw_col_count ?? "—"],
          ["Size", fmtBytes(ds.file_size_bytes)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: "var(--surface)" }}>
            <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {ds.status === "failed" && ds.etl_error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(240,77,77,0.08)", color: "#c0392b" }}>
          ✕ {ds.etl_error.slice(0, 120)}
        </p>
      )}

      <div className="flex items-center justify-between pt-1" style={{ borderTop: "1.5px solid var(--border)" }}>
        <span className="text-xs" style={{ color: "var(--muted)" }}>{fmtDate(ds.created_at)}</span>
        <div className="flex items-center gap-2">
          {ds.status === "ready" && <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>View →</span>}
          <button onClick={(e) => { e.stopPropagation(); onDelete(ds.id); }}
            className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-100"
            style={{ background: "rgba(240,77,77,0.08)", color: "#f04d4d", opacity: 0.7 }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
