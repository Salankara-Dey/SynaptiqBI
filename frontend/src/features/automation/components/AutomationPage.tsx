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
    success: { bg: "rgba(134,239,172,0.12)", color: "#86efac", label: "Success" },
    failed:  { bg: "rgba(248,113,113,0.12)", color: "#f87171", label: "Failed" },
    running: { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24", label: "Running" },
    pending: { bg: "rgba(148,163,184,0.12)", color: "#94a3b8", label: "Pending" },
  }[status];
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
    }}>
      {cfg.label}
    </span>
  );
}

function RunsPanel({
  runs, loading, onClose,
}: { runs: AutomationRun[]; loading: boolean; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: 28, width: "min(720px, 95vw)",
          maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: "#fff", fontWeight: 700, margin: 0 }}>Run History</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {loading ? (
          <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 32 }}>Loading…</p>
        ) : runs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔔</div>
            <p style={{ color: "rgba(255,255,255,0.35)", margin: 0 }}>No runs yet. Use "Test" to fire a trial webhook.</p>
          </div>
        ) : (
          <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {runs.map((run) => (
              <div key={run.id} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10, padding: "14px 18px",
                display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px 20px", alignItems: "center",
              }}>
                <div>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>{fmt(run.created_at)}</p>
                  {run.error_message && (
                    <p style={{ color: "#f87171", fontSize: 12, margin: "4px 0 0", fontFamily: "monospace" }}>
                      {run.error_message}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  {run.http_status_code && (
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>
                      HTTP {run.http_status_code}
                    </p>
                  )}
                  {duration(run.started_at, run.completed_at) && (
                    <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, margin: "2px 0 0" }}>
                      {duration(run.started_at, run.completed_at)}
                    </p>
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

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, padding: 32, width: "min(520px, 95vw)",
        display: "flex", flexDirection: "column", gap: 18,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: 18 }}>New Automation</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>NAME</label>
          <input style={inputStyle} placeholder="e.g. Notify Slack on ready" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>TRIGGER EVENT</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={eventType} onChange={(e) => setEventType(e.target.value as AutomationEventType)}>
            {(Object.keys(EVENT_LABELS) as AutomationEventType[]).map((k) => (
              <option key={k} value={k} style={{ background: "#1a1a2e" }}>{EVENT_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>WEBHOOK URL</label>
          <input style={inputStyle} placeholder="https://n8n.example.com/webhook/..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>DESCRIPTION (optional)</label>
          <input style={inputStyle} placeholder="What does this automation do?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {err && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{err}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "10px 20px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontWeight: 600 }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving} style={{
            background: "var(--accent)", border: "none", borderRadius: 8,
            padding: "10px 24px", color: "var(--ink)", fontWeight: 700, cursor: "pointer",
            opacity: saving ? 0.6 : 1, transition: "opacity 0.2s",
          }}>
            {saving ? "Creating…" : "Create"}
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

  const testLabel = { idle: "Test", sending: "Sending…", sent: "✓ Sent", error: "✗ Failed" }[testStatus];
  const testColor = { idle: "rgba(255,255,255,0.7)", sending: "#fbbf24", sent: "#86efac", error: "#f87171" }[testStatus];

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, padding: "20px 24px",
      display: "flex", flexDirection: "column", gap: 14,
      transition: "border-color 0.2s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, shrink: 0,
          background: automation.is_active ? "rgba(200,240,77,0.1)" : "rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
          border: `1px solid ${automation.is_active ? "rgba(200,240,77,0.2)" : "rgba(255,255,255,0.06)"}`,
        }}>
          {EVENT_ICONS[automation.event_type]}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h4 style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: 15 }}>{automation.name}</h4>
            <span style={{
              background: automation.is_active ? "rgba(134,239,172,0.1)" : "rgba(255,255,255,0.06)",
              color: automation.is_active ? "#86efac" : "rgba(255,255,255,0.3)",
              padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
            }}>
              {automation.is_active ? "Active" : "Paused"}
            </span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: "4px 0 0" }}>
            {EVENT_LABELS[automation.event_type]}
          </p>
          {automation.description && (
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "4px 0 0" }}>{automation.description}</p>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(automation.id, !automation.is_active)}
          style={{
            background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            padding: "6px 14px", color: "rgba(255,255,255,0.55)", cursor: "pointer",
            fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
          }}
        >
          {automation.is_active ? "Pause" : "Resume"}
        </button>
      </div>

      {/* URL */}
      <div style={{
        background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "8px 14px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>🔗</span>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "monospace", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {automation.webhook_url}
        </p>
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => onViewRuns(automation.id)}
          style={{
            background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8,
            padding: "7px 16px", color: "rgba(255,255,255,0.65)", cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}
        >
          Run History
        </button>

        <button
          onClick={() => onTest(automation.id)}
          disabled={testStatus === "sending"}
          style={{
            background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8,
            padding: "7px 16px", color: testColor, cursor: testStatus === "sending" ? "not-allowed" : "pointer",
            fontSize: 13, fontWeight: 600, transition: "color 0.2s",
          }}
        >
          {testLabel}
        </button>

        <div style={{ flex: 1 }} />

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              background: "rgba(248,113,113,0.08)", border: "none", borderRadius: 8,
              padding: "7px 16px", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            Delete
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setConfirmDelete(false)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "7px 14px", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={() => onDelete(automation.id)} style={{ background: "rgba(248,113,113,0.15)", border: "none", borderRadius: 8, padding: "7px 16px", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Confirm Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AutomationPage() {
  const {
    automations, loading, error, load, create, toggle, remove,
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
    <div style={{ padding: "32px 36px", maxWidth: 900, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 26, margin: 0 }}>Automation</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", margin: "6px 0 0", fontSize: 14 }}>
            Trigger n8n workflows or external webhooks on platform events.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: "var(--accent)", border: "none", borderRadius: 10,
            padding: "11px 22px", color: "var(--ink)", fontWeight: 700, cursor: "pointer",
            fontSize: 14, display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <span>+</span> New Automation
        </button>
      </div>

      {/* Event type legend */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        {(Object.keys(EVENT_LABELS) as AutomationEventType[]).map((k) => (
          <div key={k} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 8, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>{EVENT_ICONS[k]}</span>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{EVENT_LABELS[k]}</span>
          </div>
        ))}
      </div>

      {/* State: loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading automations…</div>
        </div>
      )}

      {/* State: error */}
      {error && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "14px 20px", marginBottom: 24 }}>
          <p style={{ color: "#f87171", margin: 0, fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* State: empty */}
      {!loading && !error && automations.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)",
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⟳</div>
          <h3 style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600, margin: "0 0 8px" }}>No automations yet</h3>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, margin: "0 0 24px" }}>
            Create your first automation to trigger n8n or any webhook when a dataset is processed or insights are generated.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              background: "var(--accent)", border: "none", borderRadius: 10,
              padding: "11px 28px", color: "var(--ink)", fontWeight: 700, cursor: "pointer", fontSize: 14,
            }}
          >
            + New Automation
          </button>
        </div>
      )}

      {/* Automation list */}
      {!loading && automations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
