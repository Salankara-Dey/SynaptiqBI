import { useState } from "react";
import { usePowerBI } from "@/features/powerbi/hooks/usePowerBI";
import { CreateReportRequest, PowerBIReport } from "@/features/powerbi/services/powerbiApi";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dt: string) {
  return new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Embedded viewer ───────────────────────────────────────────────────────────

function EmbedViewer({
  embedUrl,
  embedToken,
  reportName,
  onClose,
}: {
  embedUrl: string;
  embedToken: string;
  reportName: string;
  onClose: () => void;
}) {
  const iframeUrl = `${embedUrl}&autoAuth=false&ctid=${encodeURIComponent("powerbi")}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-neutral-900 border-b border-neutral-800 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-lime-400 text-neutral-900 flex items-center justify-center text-xs font-black">
            PBI
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">{reportName}</h3>
            <p className="text-[11px] font-mono text-neutral-400">
              Embed token valid until: {new Date(Date.now() + 55 * 60 * 1000).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost !bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
          ✕ Close Viewer
        </button>
      </div>

      {/* Frame container */}
      <div className="flex-1 bg-neutral-950">
        <iframe title={reportName} src={iframeUrl} className="w-full h-full border-0" allowFullScreen />
      </div>
    </div>
  );
}

// ── Create dialog ─────────────────────────────────────────────────────────────

function CreateDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (body: CreateReportRequest) => Promise<any>;
}) {
  const [form, setForm] = useState({ name: "", workspace_id: "", report_id: "", dataset_id: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim() || !form.workspace_id.trim() || !form.report_id.trim()) {
      setErr("Display Name, Workspace ID, and Report ID are required.");
      return;
    }
    setSaving(true);
    setErr(null);
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
      setErr(e.response?.data?.detail || "Failed to register Power BI report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card p-8 w-full max-w-lg shadow-2xl flex flex-col gap-4 animate-scale-in">
        <div className="flex justify-between items-center pb-3 border-b border-black/10">
          <h3 className="font-extrabold text-base text-slate-900">Register Power BI Embedded Report</h3>
          <button onClick={onClose} className="text-sm font-bold text-neutral-400 hover:text-slate-900">
            ✕
          </button>
        </div>

        {[
          { key: "name", label: "Display Name", placeholder: "e.g. Executive Sales Dashboard" },
          { key: "workspace_id", label: "Workspace ID (Azure Group ID)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "report_id", label: "Report ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "dataset_id", label: "Dataset ID (Optional)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "description", label: "Description (Optional)", placeholder: "Summary of report data" },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{label}</label>
            <input
              className="input-field font-semibold"
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
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? "Registering..." : "Register Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────

function ReportCard({
  report,
  onOpen,
  onDelete,
  opening,
}: {
  report: PowerBIReport;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  opening: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="card-interactive p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
          PBI
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-base text-slate-900 leading-snug">{report.name}</h4>
          {report.description && (
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">{report.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 font-mono text-[11px] text-neutral-500">
            <span>Report ID: {report.report_id}</span>
            <span>•</span>
            <span>Registered {fmt(report.created_at)}</span>
          </div>
        </div>

        <button onClick={() => onOpen(report.id)} disabled={opening} className="btn-primary shrink-0">
          {opening ? "Acquiring Token..." : "▶ Launch Report"}
        </button>
      </div>

      <div className="p-3 rounded-lg flex gap-4 flex-wrap text-xs font-mono bg-slate-50 border border-black/5">
        <span className="text-neutral-500">
          Workspace ID: <strong className="text-slate-900">{report.workspace_id}</strong>
        </span>
        {report.dataset_id && (
          <span className="text-neutral-500">
            Dataset ID: <strong className="text-slate-900">{report.dataset_id}</strong>
          </span>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1 border-t border-black/5">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded hover:bg-rose-50 transition-colors"
          >
            Remove
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="text-xs font-semibold px-2 py-1 text-neutral-500">
              Cancel
            </button>
            <button onClick={() => onDelete(report.id)} className="text-xs font-bold px-3 py-1.5 rounded bg-rose-600 text-white">
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
    reports,
    loading,
    error,
    status,
    create,
    remove,
    activeReportId,
    embedToken,
    embedLoading,
    openReport,
    closeEmbed,
  } = usePowerBI();

  const [showCreate, setShowCreate] = useState(false);
  const activeReport = reports.find((r) => r.id === activeReportId);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-black/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded bg-neutral-900 text-lime-400">
              ENTERPRISE CONNECTOR
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Power BI Embedded Workspace</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Securely embed enterprise Power BI reports directly in your workspace with Azure AD Service Principal auth.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Register Report
        </button>
      </div>

      {/* Config status banner */}
      {status && (
        <div
          className={`p-4 rounded-xl mb-6 flex items-center justify-between gap-3 text-xs font-medium border ${
            status.configured
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-sm">{status.configured ? "✅" : "⚠️"}</span>
            <span className="font-bold">{status.message}</span>
          </div>
          {!status.configured && (
            <span className="text-[10px] px-2.5 py-1 rounded bg-amber-100/80 text-amber-800 font-mono shrink-0 font-bold">
              Configure Azure Credentials in .env
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl mb-6 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-16 text-xs font-bold text-neutral-500">
          Loading registered Power BI reports...
        </div>
      )}

      {/* Empty State */}
      {!loading && reports.length === 0 && (
        <div className="card p-12 text-center flex flex-col items-center border-dashed border-2">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-900">No Power BI reports registered</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mb-6">
            Register your Microsoft Azure Power BI Workspace and Report IDs to enable embedded viewer sessions.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
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
      {showCreate && <CreateDialog onClose={() => setShowCreate(false)} onCreate={create} />}

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
