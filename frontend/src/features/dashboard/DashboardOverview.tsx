import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/features/auth/services/authApi";

const STATS = [
  { label: "Datasets", value: "—", sub: "See Datasets tab", icon: "⊞" },
  { label: "AI Insights", value: "—", sub: "Available in Phase 4", icon: "◎" },
  { label: "Queries Run", value: "—", sub: "Available in Phase 4", icon: "⌘" },
  { label: "Workflows", value: "—", sub: "Available in Phase 5", icon: "⟳" },
];

const PHASES = [
  { num: 1, label: "Foundation", status: "done",     desc: "Auth · DB · Routing" },
  { num: 2, label: "Data Layer", status: "active",   desc: "Upload · ETL · Storage" },
  { num: 3, label: "Analytics",  status: "upcoming", desc: "APIs · Aggregations" },
  { num: 4, label: "AI Engine",  status: "upcoming", desc: "Insights · NL→SQL · Forecast" },
  { num: 5, label: "Automation", status: "upcoming", desc: "n8n · Power BI" },
];

export default function DashboardOverview() {
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    authService.me().then((res) => setUser(res.data.user)).catch(() => {});
  }, [setUser]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>{greeting}</p>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{user?.full_name ?? "Welcome"} ↗</h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--muted)" }}>Your SynaptiqBI workspace · Phase 2 active</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS.map(({ label, value, sub, icon }, i) => (
          <div key={label} className="card p-5 animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-xl" style={{ color: "var(--muted)" }}>{icon}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>Soon</span>
            </div>
            <p className="text-2xl font-black mb-0.5" style={{ color: "var(--ink)" }}>{value}</p>
            <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{label}</p>
            <p className="text-xs mt-1" style={{ color: "rgba(138,137,144,0.7)" }}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="card p-6 animate-fade-up-2">
        <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: "var(--muted)" }}>Build Roadmap</p>
        <div className="flex flex-col gap-3">
          {PHASES.map(({ num, label, status, desc }) => (
            <div key={num} className="flex items-center gap-4 p-3 rounded-lg transition-all"
              style={{
                background: status === "active" ? "rgba(200,240,77,0.08)" : "transparent",
                border: status === "active" ? "1.5px solid rgba(200,240,77,0.3)" : "1.5px solid transparent",
              }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                style={{
                  background: status === "active" || status === "done" ? "var(--ink)" : "var(--surface-2)",
                  color: status === "active" || status === "done" ? "var(--accent)" : "var(--muted)",
                }}>
                {status === "done" ? "✓" : num}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{label}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{desc}</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                style={{
                  background: status === "active" ? "var(--ink)" : status === "done" ? "rgba(77,207,127,0.12)" : "var(--surface-2)",
                  color: status === "active" ? "var(--accent)" : status === "done" ? "#1a7a45" : "var(--muted)",
                }}>
                {status === "active" ? "● Active" : status === "done" ? "Complete" : "Upcoming"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
