import { useState } from "react";
import { usePowerBI } from "@/features/powerbi/hooks/usePowerBI";
import { CreateReportRequest, PowerBIReport } from "@/features/powerbi/services/powerbiApi";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dt: string) {
  return new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Embedded viewer ───────────────────────────────────────────────────────────

function EmbedViewer({ embedUrl, embedToken, reportName, onClose }: {
  embedUrl: string;
  embedToken: string;
  reportName: string;
  onClose: () => void;
}) {
  const iframeUrl = `${embedUrl}&autoAuth=false&ctid=${encodeURIComponent("powerbi")}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <span className="text-xl">📊</span>
          <div>
            <h3 className="font-bold text-base" style={{ color: "var(--ink)" }}>{reportName}</h3>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Token expires: {new Date(Date.now() + 55 * 60 * 1000).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="btn-ghost py-1.5 px-4 text-xs font-bold"
        >
          ✕ Close Viewer
        </button>
      </div>

      {/* iFrame container */}
      <div className="flex-1 bg-neutral-900">
        <iframe
          title={reportName}
          src={iframeUrl}
          className="w-full h-full border-0"
          allowFullScreen
        />
      </div>
    </div>
  );
}

// ── Create dialog ─────────────────────────────────────────────────────────────

function CreateDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (body: CreateReportRequest) => Promise<any>;
}) {
  const [form, setForm] = useState({ name: "", workspace_id: "", report_id: "", dataset_id: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim() || !form.workspace_id.trim() || !form.report_id.trim()) {
      setErr("Name, Workspace ID, and Report ID are required.");
      return;
    }
    setSaving(true); setErr(null);
    try {
      await onCreate({
        name: form.name,
        workspace_id: form.workspace_id,
        report_id: form.report_id,
        dataset_id: form.dataset_id || undefined,
        description: form.description || undefined,
      });
      onClose();
    } catch (e: any) {
      setErr(e.response?.data?.detail || "Failed to register report");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="card p-8 w-full max-w-lg shadow-2xl flex flex-col gap-4 animate-scale-in"
      >
        <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--ink)" }}>Register Power BI Report</h3>
          <button onClick={onClose} className="text-xl leading-none text-neutral-400 hover:text-black">✕</button>
        </div>

        {[
          { key: "name", label: "Display Name", placeholder: "e.g. Executive Sales Dashboard" },
          { key: "workspace_id", label: "Workspace ID (Group ID)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "report_id", label: "Report ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "dataset_id", label: "Dataset ID (optional)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "description", label: "Description (optional)", placeholder: "Summary of this report" },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--muted)" }}>{label}</label>
            <input
              className="input-field"
              placeholder={placeholder}
              value={(form as any)[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          </div>
        ))}

        {err && (
          <div className="p-3 rounded-lg text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
            {err}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="btn-ghost text-xs font-bold py-2 px-4">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary text-xs font-bold py-2 px-5">
            {saving ? "Registering…" : "Register Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────

function ReportCard({ report, onOpen, onDelete, opening }: {
  report: PowerBIReport;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  opening: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="card p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: "rgba(243,117,36,0.12)", color: "#f97316" }}
        >
          📊
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-base leading-snug" style={{ color: "var(--ink)" }}>{report.name}</h4>
          {report.description && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>{report.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 font-mono text-[11px]" style={{ color: "var(--muted)" }}>
            <span>Report: {report.report_id}</span>
            <span>•</span>
            <span>Added {fmt(report.created_at)}</span>
          </div>
        </div>

        <button
          onClick={() => onOpen(report.id)}
          disabled={opening}
          className="btn-primary text-xs font-bold py-2.5 px-5 shrink-0"
        >
          {opening ? "Generating Token…" : "▶ Open Report"}
        </button>
      </div>

      <div className="p-3 rounded-lg flex gap-4 flex-wrap text-xs font-mono" style={{ background: "var(--surface)" }}>
        <span style={{ color: "var(--muted)" }}>
          Workspace: <strong style={{ color: "var(--ink)" }}>{report.workspace_id}</strong>
        </span>
        {report.dataset_id && (
          <span style={{ color: "var(--muted)" }}>
            Dataset: <strong style={{ color: "var(--ink)" }}>{report.dataset_id}</strong>
          </span>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-semibold py-1.5 px-3 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
          >
            Remove
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs font-semibold py-1.5 px-3 rounded-lg text-neutral-600 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(report.id)}
              className="text-xs font-bold py-1.5 px-3 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              Confirm Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PowerBIPage() {
  const {
    reports, loading, error, status,
    create, remove,
    activeReportId, embedToken, embedLoading, openReport, closeEmbed,
  } = usePowerBI();

  const [showCreate, setShowCreate] = useState(false);
  const activeReport = reports.find((r) => r.id === activeReportId);

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Phase 6</p>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>Power BI Embedded</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Securely embed enterprise Power BI reports directly in your workspace.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary text-xs font-bold"
        >
          + Register Report
        </button>
      </div>

      {/* Config status banner */}
      {status && (
        <div className={`p-4 rounded-xl mb-6 flex items-center justify-between gap-3 text-sm font-medium border ${
          status.configured
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="text-base">{status.configured ? "✅" : "⚠️"}</span>
            <span>{status.message}</span>
          </div>
          {!status.configured && (
            <span className="text-xs px-2 py-1 rounded bg-amber-100/80 text-amber-800 font-mono shrink-0">
              Configure in .env & restart backend
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl mb-6 text-sm font-semibold bg-rose-50 border border-rose-200 text-rose-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-sm" style={{ color: "var(--muted)" }}>
          Loading Power BI reports…
        </div>
      )}

      {/* Empty State */}
      {!loading && reports.length === 0 && (
        <div className="card p-12 text-center flex flex-col items-center border-dashed border-2 border-[var(--border)]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4" style={{ background: "var(--surface)" }}>
            📊
          </div>
          <h3 className="text-lg font-bold mb-1" style={{ color: "var(--ink)" }}>No reports registered</h3>
          <p className="text-xs max-w-md mb-6 leading-relaxed" style={{ color: "var(--muted)" }}>
            Connect Power BI reports by registering their Azure workspace and report identifiers.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-xs font-bold"
          >
            + Register Report
          </button>
        </div>
      )}

      {/* Report list */}
      {!loading && reports.length > 0 && (
        <div className="flex flex-col gap-4">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              onOpen={openReport}
              onDelete={remove}
              opening={embedLoading && activeReportId === r.id}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {showCreate && (
        <CreateDialog onClose={() => setShowCreate(false)} onCreate={create} />
      )}

      {/* Fullscreen embed viewer */}
      {embedToken && activeReport && (
        <EmbedViewer
          embedUrl={embedToken.embed_url}
          embedToken={embedToken.embed_token}
          reportName={activeReport.name}
          onClose={closeEmbed}
        />
      )}
    </div>
  );
}
