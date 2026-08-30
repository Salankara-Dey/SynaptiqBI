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
  dataset_ready: "Dataset Ready (ETL complete)",
  insight_generated: "AI Insights Generated",
};

const EVENT_ICONS: Record<AutomationEventType, string> = {
  dataset_uploaded: "⊞",
  dataset_ready: "✓",
  insight_generated: "◎",
};

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
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
    failed:  { bg: "rgba(239,68,68,0.12)",  color: "#dc2626", label: "Failed" },
    running: { bg: "rgba(245,158,11,0.12)",  color: "#d97706", label: "Running" },
    pending: { bg: "rgba(107,114,128,0.12)", color: "#4b5563", label: "Pending" },
  }[status];
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function RunsPanel({
  runs, loading, onClose,
}: { runs: AutomationRun[]; loading: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="card p-6 w-full max-w-2xl max-h-[80vh] flex flex-col gap-4 shadow-2xl animate-scale-in"
      >
        <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--ink)" }}>Webhook Run History</h3>
          <button onClick={onClose} className="text-xl leading-none text-neutral-400 hover:text-black">✕</button>
        </div>

        {loading ? (
          <p className="text-center py-12 text-xs" style={{ color: "var(--muted)" }}>Loading run logs…</p>
        ) : runs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">🔔</div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>No webhook runs logged yet. Click "Test" to fire a trial webhook.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex flex-col gap-2.5 pr-1 max-h-[55vh]">
            {runs.map((run) => (
              <div
                key={run.id}
                className="p-3.5 rounded-xl border border-[var(--border)] flex items-center justify-between gap-4"
                style={{ background: "var(--surface)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{fmt(run.created_at)}</p>
                  {run.error_message && (
                    <p className="text-[11px] font-mono text-rose-600 mt-1 truncate">{run.error_message}</p>
                  )}
                </div>
                <div className="text-right text-xs font-mono shrink-0">
                  {run.http_status_code && (
                    <p style={{ color: "var(--ink)" }}>HTTP {run.http_status_code}</p>
                  )}
                  {duration(run.started_at, run.completed_at) && (
                    <p className="text-[10px]" style={{ color: "var(--muted)" }}>{duration(run.started_at, run.completed_at)}</p>
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

function CreateDialog({ onClose, onCreate }: {
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
    if (!name.trim() || !webhookUrl.trim()) { setErr("Name and Webhook URL are required."); return; }
    setSaving(true);
    setErr(null);
    try {
      await onCreate({ name, event_type: eventType, webhook_url: webhookUrl, description: description || undefined });
      onClose();
    } catch (e: any) {
      setErr(e.response?.data?.detail || "Failed to create automation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card p-8 w-full max-w-lg shadow-2xl flex flex-col gap-4 animate-scale-in">
        <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--ink)" }}>New Webhook Automation</h3>
          <button onClick={onClose} className="text-xl leading-none text-neutral-400 hover:text-black">✕</button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--muted)" }}>Name</label>
          <input className="input-field" placeholder="e.g. Notify Slack channel on ready" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--muted)" }}>Trigger Event</label>
          <select className="input-field cursor-pointer" value={eventType} onChange={(e) => setEventType(e.target.value as AutomationEventType)}>
            {(Object.keys(EVENT_LABELS) as AutomationEventType[]).map((k) => (
              <option key={k} value={k}>{EVENT_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--muted)" }}>Webhook URL</label>
          <input className="input-field font-mono text-xs" placeholder="https://n8n.example.com/webhook/..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--muted)" }}>Description (optional)</label>
          <input className="input-field" placeholder="What workflow does this trigger?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {err && (
          <div className="p-3 rounded-lg text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
            {err}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="btn-ghost text-xs font-bold py-2 px-4">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary text-xs font-bold py-2 px-5">
            {saving ? "Creating…" : "Create Automation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Automation card ───────────────────────────────────────────────────────────

function AutomationCard({
  automation, testStatus, onToggle, onDelete, onViewRuns, onTest,
}: {
  automation: Automation;
  testStatus: "idle" | "sending" | "sent" | "error";
  onToggle: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
  onViewRuns: (id: string) => void;
  onTest: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const testLabel = { idle: "⚡ Test Webhook", sending: "Dispatching…", sent: "✓ Dispatched", error: "✗ Failed" }[testStatus];

  return (
    <div className="card p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{
            background: automation.is_active ? "rgba(200,240,77,0.3)" : "var(--surface)",
            color: "var(--ink)",
          }}
        >
          {EVENT_ICONS[automation.event_type]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h4 className="font-bold text-base leading-snug" style={{ color: "var(--ink)" }}>{automation.name}</h4>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                automation.is_active
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-neutral-100 text-neutral-500 border border-neutral-200"
              }`}
            >
              {automation.is_active ? "Active" : "Paused"}
            </span>
          </div>
          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--muted)" }}>
            Trigger: <strong>{EVENT_LABELS[automation.event_type]}</strong>
          </p>
          {automation.description && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>{automation.description}</p>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(automation.id, !automation.is_active)}
          className="btn-ghost py-1.5 px-3 text-xs font-semibold shrink-0"
        >
          {automation.is_active ? "Pause" : "Resume"}
        </button>
      </div>

      {/* URL box */}
      <div className="p-3 rounded-lg flex items-center gap-2 text-xs font-mono" style={{ background: "var(--surface)" }}>
        <span style={{ color: "var(--muted)" }}>🔗</span>
        <span className="truncate flex-1" style={{ color: "var(--ink)" }}>{automation.webhook_url}</span>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onViewRuns(automation.id)}
          className="btn-ghost text-xs font-bold py-1.5 px-3.5"
        >
          Run History
        </button>

        <button
          onClick={() => onTest(automation.id)}
          disabled={testStatus === "sending"}
          className={`text-xs font-bold py-1.5 px-3.5 rounded-lg border transition-colors ${
            testStatus === "sent"
              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
              : testStatus === "error"
              ? "bg-rose-50 text-rose-700 border-rose-300"
              : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
          }`}
        >
          {testLabel}
        </button>

        <div className="flex-1" />

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-semibold py-1.5 px-3 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
          >
            Delete
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="text-xs font-semibold py-1.5 px-3 rounded-lg text-neutral-600 hover:bg-neutral-100">Cancel</button>
            <button onClick={() => onDelete(automation.id)} className="text-xs font-bold py-1.5 px-3 rounded-lg bg-rose-600 text-white hover:bg-rose-700">Confirm</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AutomationPage() {
  const {
    automations, loading, error, create, toggle, remove,
    selectedId, runs, runsLoading, loadRuns,
    testStatus, sendTest,
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
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Phase 5</p>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>Automation</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Automatically dispatch webhooks to n8n, Slack, or Zapier on dataset and insight events.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary text-xs font-bold"
        >
          + New Automation
        </button>
      </div>

      {/* Event type legend */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {(Object.keys(EVENT_LABELS) as AutomationEventType[]).map((k) => (
          <div key={k} className="px-3 py-1.5 rounded-lg border border-[var(--border)] flex items-center gap-2 text-xs font-medium" style={{ background: "white" }}>
            <span>{EVENT_ICONS[k]}</span>
            <span style={{ color: "var(--muted)" }}>{EVENT_LABELS[k]}</span>
          </div>
        ))}
      </div>

      {/* State: loading */}
      {loading && (
        <div className="text-center py-16 text-sm" style={{ color: "var(--muted)" }}>
          Loading automations…
        </div>
      )}

      {/* State: error */}
      {error && (
        <div className="p-4 rounded-xl mb-6 text-sm font-semibold bg-rose-50 border border-rose-200 text-rose-700">
          {error}
        </div>
      )}

      {/* State: empty */}
      {!loading && !error && automations.length === 0 && (
        <div className="card p-12 text-center flex flex-col items-center border-dashed border-2 border-[var(--border)]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4" style={{ background: "var(--surface)" }}>
            ⟳
          </div>
          <h3 className="text-lg font-bold mb-1" style={{ color: "var(--ink)" }}>No automations yet</h3>
          <p className="text-xs max-w-md mb-6 leading-relaxed" style={{ color: "var(--muted)" }}>
            Set up automatic webhook triggers when datasets finish processing or AI generates fresh insights.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-xs font-bold"
          >
            + New Automation
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
      {showCreate && (
        <CreateDialog onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}

      {runsOpen && selectedId && (
        <RunsPanel
          runs={runs}
          loading={runsLoading}
          onClose={handleCloseRuns}
        />
      )}
    </div>
  );
}
