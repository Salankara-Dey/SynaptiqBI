import { useState } from "react";
import { useAutomation } from "@/features/automation/hooks/useAutomation";
import {
  Automation,
  AutomationEventType,
  AutomationRun,
  CreateAutomationRequest,
} from "@/features/automation/services/automationApi";

// ── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<AutomationEventType, string> = {
  dataset_uploaded: "Dataset Uploaded",
  dataset_ready: "ETL Processing Complete",
  insight_generated: "AI Insights Generated",
};

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duration(started: string | null, completed: string | null) {
  if (!started || !completed) return null;
  const ms = new Date(completed).getTime() - new Date(started).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AutomationRun["status"] }) {
  const cfg = {
    success: { bg: "rgba(16,185,129,0.12)", color: "#059669", label: "Success" },
    failed: { bg: "rgba(239,68,68,0.12)", color: "#dc2626", label: "Failed" },
    running: { bg: "rgba(245,158,11,0.12)", color: "#d97706", label: "Running" },
    pending: { bg: "rgba(107,114,128,0.12)", color: "#4b5563", label: "Pending" },
  }[status];
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function RunsPanel({
  runs,
  loading,
  onClose,
}: {
  runs: AutomationRun[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="card p-6 w-full max-w-2xl max-h-[80vh] flex flex-col gap-4 shadow-2xl animate-scale-in"
      >
        <div className="flex justify-between items-center pb-3 border-b border-black/10">
          <h3 className="font-extrabold text-base text-slate-900">Webhook Run History & Diagnostics</h3>
          <button onClick={onClose} className="text-sm font-bold text-neutral-400 hover:text-slate-900">
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-center py-12 text-xs font-semibold text-neutral-500">Loading webhook execution logs...</p>
        ) : runs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xs font-bold text-slate-900">No dispatch runs logged</p>
            <p className="text-[11px] text-neutral-500 mt-1">Click "Test Webhook" on an automation card to trigger a trial payload.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex flex-col gap-2.5 pr-1 max-h-[55vh]">
            {runs.map((run) => (
              <div
                key={run.id}
                className="p-3.5 rounded-xl border border-black/5 bg-slate-50 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">{fmt(run.created_at)}</p>
                  {run.error_message && (
                    <p className="text-[11px] font-mono text-rose-600 mt-1 truncate">{run.error_message}</p>
                  )}
                </div>
                <div className="text-right text-xs font-mono shrink-0">
                  {run.http_status_code && (
                    <p className="font-bold text-slate-900">HTTP {run.http_status_code}</p>
                  )}
                  {duration(run.started_at, run.completed_at) && (
                    <p className="text-[10px] text-neutral-500">{duration(run.started_at, run.completed_at)}</p>
                  )}
                </div>
                <StatusBadge status={run.status} />
              </div>
            ))}
          </div>
        )}
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
  onCreate: (body: CreateAutomationRequest) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState<AutomationEventType>("dataset_ready");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !webhookUrl.trim()) {
      setErr("Automation Name and Webhook Endpoint URL are required.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onCreate({ name, event_type: eventType, webhook_url: webhookUrl, description: description || undefined });
      onClose();
    } catch (e: any) {
      setErr(e.response?.data?.detail || "Failed to create automation rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card p-8 w-full max-w-lg shadow-2xl flex flex-col gap-4 animate-scale-in">
        <div className="flex justify-between items-center pb-3 border-b border-black/10">
          <h3 className="font-extrabold text-base text-slate-900">New Webhook Automation Rule</h3>
          <button onClick={onClose} className="text-sm font-bold text-neutral-400 hover:text-slate-900">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Automation Name</label>
          <input className="input-field font-semibold" placeholder="e.g. Trigger n8n Workflow on ETL Ready" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Trigger Event</label>
          <select className="input-field font-semibold cursor-pointer" value={eventType} onChange={(e) => setEventType(e.target.value as AutomationEventType)}>
            {(Object.keys(EVENT_LABELS) as AutomationEventType[]).map((k) => (
              <option key={k} value={k}>
                {EVENT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Webhook Endpoint URL</label>
          <input className="input-field font-mono text-xs" placeholder="http://localhost:5678/webhook/..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Description (Optional)</label>
          <input className="input-field" placeholder="Brief description of integrated downstream flow" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

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
            {saving ? "Creating..." : "Create Automation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Automation card ───────────────────────────────────────────────────────────

function AutomationCard({
  automation,
  testStatus,
  onToggle,
  onDelete,
  onViewRuns,
  onTest,
}: {
  automation: Automation;
  testStatus: "idle" | "sending" | "sent" | "error";
  onToggle: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
  onViewRuns: (id: string) => void;
  onTest: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const testLabel = { idle: "Test Webhook", sending: "Dispatching...", sent: "Dispatched", error: "Failed" }[testStatus];

  return (
    <div className="card-interactive p-6 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl bg-neutral-900 text-lime-400 flex items-center justify-center text-xs font-black shrink-0 shadow-sm"
        >
          WH
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h4 className="font-bold text-base text-slate-900 leading-snug">{automation.name}</h4>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                automation.is_active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-neutral-100 text-neutral-500 border-neutral-200"
              }`}
            >
              {automation.is_active ? "● Active" : "Paused"}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Trigger Event: <strong className="text-slate-900">{EVENT_LABELS[automation.event_type]}</strong>
          </p>
          {automation.description && (
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">{automation.description}</p>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(automation.id, !automation.is_active)}
          className="btn-ghost"
        >
          {automation.is_active ? "Pause Rule" : "Resume Rule"}
        </button>
      </div>

      {/* URL display box */}
      <div className="p-3 rounded-lg flex items-center gap-2 text-xs font-mono bg-slate-50 border border-black/5">
        <span className="text-neutral-400 font-bold">URL:</span>
        <span className="truncate flex-1 text-slate-900 font-semibold">{automation.webhook_url}</span>
      </div>

      {/* Action buttons footer */}
      <div className="flex items-center gap-2 pt-2 border-t border-black/5">
        <button onClick={() => onViewRuns(automation.id)} className="btn-ghost">
          Run Log History
        </button>

        <button
          onClick={() => onTest(automation.id)}
          disabled={testStatus === "sending"}
          className={`btn-ghost ${
            testStatus === "sent"
              ? "!bg-emerald-50 !text-emerald-700 !border-emerald-300"
              : testStatus === "error"
              ? "!bg-rose-50 !text-rose-700 !border-rose-300"
              : ""
          }`}
        >
          {testLabel}
        </button>

        <div className="flex-1" />

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded hover:bg-rose-50 transition-colors"
          >
            Delete
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="text-xs font-semibold px-2 py-1 text-neutral-500">
              Cancel
            </button>
            <button onClick={() => onDelete(automation.id)} className="text-xs font-bold px-3 py-1.5 rounded bg-rose-600 text-white">
              Confirm Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AutomationPage() {
  const {
    automations,
    loading,
    error,
    create,
    toggle,
    remove,
    selectedId,
    runs,
    runsLoading,
    loadRuns,
    testStatus,
    sendTest,
  } = useAutomation();

  const [showCreate, setShowCreate] = useState(false);
  const [runsOpen, setRunsOpen] = useState(false);

  const handleCreate = async (body: CreateAutomationRequest) => {
    await create(body);
  };

  const handleViewRuns = (id: string) => {
    setRunsOpen(true);
    loadRuns(id);
  };

  const handleCloseRuns = () => {
    setRunsOpen(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-black/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded bg-neutral-900 text-lime-400">
              WORKFLOW INTEGRATION
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">n8n & Webhook Automation Engine</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Automatically dispatch asynchronous HTTP webhooks to n8n, Slack, or Zapier when dataset events occur.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New Automation Rule
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {(Object.keys(EVENT_LABELS) as AutomationEventType[]).map((k) => (
          <div key={k} className="px-3 py-1.5 rounded-lg border border-black/5 bg-white flex items-center gap-2 text-xs font-semibold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-neutral-900" />
            <span>{EVENT_LABELS[k]}</span>
          </div>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-16 text-xs font-bold text-neutral-500">
          Loading active automation rules...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl mb-6 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && automations.length === 0 && (
        <div className="card p-12 text-center flex flex-col items-center border-dashed border-2">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-900">No active webhook automations</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mb-6">
            Configure automated webhook rules to notify n8n, Slack, or web endpoints when ETL finishes or AI insights generate.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + Create First Automation
          </button>
        </div>
      )}

      {/* Automation list */}
      {!loading && automations.length > 0 && (
        <div className="flex flex-col gap-4">
          {automations.map((a) => (
            <AutomationCard
              key={a.id}
              automation={a}
              testStatus={testStatus[a.id] ?? "idle"}
              onToggle={toggle}
              onDelete={remove}
              onViewRuns={handleViewRuns}
              onTest={sendTest}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {showCreate && <CreateDialog onClose={() => setShowCreate(false)} onCreate={handleCreate} />}

      {runsOpen && selectedId && (
        <RunsPanel runs={runs} loading={runsLoading} onClose={handleCloseRuns} />
      )}
    </div>
  );
}
