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
  // Build the iframe URL with the embed token
  const iframeUrl = `${embedUrl}&autoAuth=false&ctid=${encodeURIComponent("powerbi")}`;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", background: "var(--surface)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <div>
            <h3 style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: 15 }}>{reportName}</h3>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0 }}>
              Token expires: {new Date(Date.now() + 55 * 60 * 1000).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8,
            padding: "8px 18px", color: "rgba(255,255,255,0.7)", cursor: "pointer",
            fontWeight: 600, fontSize: 13,
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* iFrame container */}
      <div style={{ flex: 1, padding: 0 }}>
        <iframe
          title={reportName}
          src={iframeUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
          allowFullScreen
        />
      </div>
    </div>
  );
}

// ── Create dialog ─────────────────────────────────────────────────────────────

function CreateDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (body: CreateReportRequest) => Promise<void>;
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

  const input: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box",
  };
  const label: React.CSSProperties = { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, letterSpacing: 1 };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, padding: 32, width: "min(540px, 95vw)", display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: 18 }}>Register Power BI Report</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {[
          { key: "name", label: "DISPLAY NAME", placeholder: "e.g. Sales Dashboard Q4" },
          { key: "workspace_id", label: "WORKSPACE ID (GROUP ID)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "report_id", label: "REPORT ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "dataset_id", label: "DATASET ID (optional)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "description", label: "DESCRIPTION (optional)", placeholder: "What does this report show?" },
        ].map(({ key, label: lbl, placeholder }) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={label}>{lbl}</label>
            <input style={input} placeholder={placeholder} value={(form as any)[key]}
              onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}

        {err && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{err}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "10px 20px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{
            background: "var(--accent)", border: "none", borderRadius: 8, padding: "10px 24px",
            color: "var(--ink)", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1,
          }}>
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
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: "rgba(243,117,36,0.1)", border: "1px solid rgba(243,117,36,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>📊</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: 15 }}>{report.name}</h4>
          {report.description && (
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "4px 0 0" }}>{report.description}</p>
          )}
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, margin: "6px 0 0", fontFamily: "monospace" }}>
            Report: {report.report_id}
          </p>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, margin: "2px 0 0" }}>
            Added {fmt(report.created_at)}
          </p>
        </div>

        <button
          onClick={() => onOpen(report.id)}
          disabled={opening}
          style={{
            background: "var(--accent)", border: "none", borderRadius: 8,
            padding: "9px 20px", color: "var(--ink)", fontWeight: 700,
            cursor: opening ? "not-allowed" : "pointer", fontSize: 13,
            opacity: opening ? 0.6 : 1, whiteSpace: "nowrap",
          }}
        >
          {opening ? "Loading…" : "▶ Open Report"}
        </button>
      </div>

      <div style={{
        background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "8px 14px",
        display: "flex", gap: 16, flexWrap: "wrap",
      }}>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
          Workspace: <code style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{report.workspace_id}</code>
        </span>
        {report.dataset_id && (
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
            Dataset: <code style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{report.dataset_id}</code>
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ background: "rgba(248,113,113,0.08)", border: "none", borderRadius: 8, padding: "6px 14px", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Remove</button>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setConfirmDelete(false)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "6px 14px", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 12 }}>Cancel</button>
            <button onClick={() => onDelete(report.id)} style={{ background: "rgba(248,113,113,0.15)", border: "none", borderRadius: 8, padding: "6px 16px", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Confirm</button>
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
    <div style={{ padding: "32px 36px", maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 26, margin: 0 }}>Power BI Embedded</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", margin: "6px 0 0", fontSize: 14 }}>
            Embed enterprise Power BI reports directly in your workspace.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: "var(--accent)", border: "none", borderRadius: 10,
            padding: "11px 22px", color: "var(--ink)", fontWeight: 700, cursor: "pointer", fontSize: 14,
          }}
        >
          + Register Report
        </button>
      </div>

      {/* Config status banner */}
      {status && (
        <div style={{
          background: status.configured ? "rgba(134,239,172,0.07)" : "rgba(251,191,36,0.07)",
          border: `1px solid ${status.configured ? "rgba(134,239,172,0.2)" : "rgba(251,191,36,0.2)"}`,
          borderRadius: 10, padding: "12px 18px", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>{status.configured ? "✓" : "⚠"}</span>
          <p style={{ color: status.configured ? "#86efac" : "#fbbf24", margin: 0, fontSize: 13 }}>
            {status.message}
          </p>
          {!status.configured && (
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginLeft: "auto" }}>
              Set env vars and restart
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "12px 18px", marginBottom: 20 }}>
          <p style={{ color: "#f87171", margin: 0, fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>Loading…</div>
      )}

      {/* Empty */}
      {!loading && reports.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16,
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
          <h3 style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600, margin: "0 0 8px" }}>No reports registered</h3>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, margin: "0 0 24px" }}>
            Register a Power BI report using its workspace ID and report ID from your Azure tenant.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              background: "var(--accent)", border: "none", borderRadius: 10,
              padding: "11px 28px", color: "var(--ink)", fontWeight: 700, cursor: "pointer", fontSize: 14,
            }}
          >
            + Register Report
          </button>
        </div>
      )}

      {/* Report list */}
      {!loading && reports.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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

      {/* Embedded report fullscreen viewer */}
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
