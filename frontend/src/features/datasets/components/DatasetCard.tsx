import { Dataset } from "@/features/datasets/services/datasetsApi";

interface DatasetCardProps {
  dataset: Dataset;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}

const STATUS_CONFIG = {
  pending: { label: "Pending", dot: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  running: { label: "ETL Running", dot: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  ready: { label: "Ready", dot: "#10b981", bg: "rgba(16,185,129,0.12)" },
  failed: { label: "Failed", dot: "#ef4444", bg: "rgba(239,68,68,0.12)" },
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
    <div
      className="card-interactive p-5 flex flex-col justify-between h-full cursor-pointer"
      onClick={() => ds.status === "ready" && onClick(ds.id)}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-neutral-900 text-lime-400 flex items-center justify-center text-[10px] font-black shrink-0">
              {ds.original_filename.split(".").pop()?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{ds.name}</p>
              <p className="text-[11px] text-neutral-500 truncate font-mono">{ds.original_filename}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ background: cfg.bg }}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isProcessing ? "animate-ping" : ""}`} style={{ background: cfg.dot }} />
            <span style={{ color: cfg.dot }}>{cfg.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            ["Rows", ds.status === "ready" ? ds.clean_row_count?.toLocaleString() : ds.raw_row_count?.toLocaleString() ?? "—"],
            ["Columns", ds.raw_col_count ?? "—"],
            ["File Size", fmtBytes(ds.file_size_bytes)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg p-2.5 text-center bg-slate-50 border border-black/5">
              <p className="text-xs font-bold text-slate-900">{value}</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {ds.status === "failed" && ds.etl_error && (
          <p className="text-[11px] px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-mono mb-4">
            ✕ {ds.etl_error.slice(0, 120)}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-black/5 text-[11px] text-neutral-500 font-mono">
        <span>{fmtDate(ds.created_at)}</span>
        <div className="flex items-center gap-2">
          {ds.status === "ready" && (
            <span className="text-xs font-bold text-slate-900 hover:text-lime-600 transition-colors">
              Inspect Data →
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(ds.id);
            }}
            className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
