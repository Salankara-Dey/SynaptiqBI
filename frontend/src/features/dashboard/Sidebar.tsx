import { NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

const NAV_ITEMS = [
  { to: "/dashboard",            icon: "◈", label: "Overview",    phase: null },
  { to: "/dashboard/datasets",   icon: "⊞", label: "Datasets",    phase: null },
  { to: "/dashboard/insights",   icon: "◎", label: "AI Insights", phase: "P4" },
  { to: "/dashboard/query",      icon: "⌘", label: "NL Query",    phase: "P4" },
  { to: "/dashboard/forecasts",  icon: "∿", label: "Forecasting", phase: "P4" },
  { to: "/dashboard/automation", icon: "⟳", label: "Automation",  phase: "P5" },
];

export function Sidebar() {
  const { signOut } = useAuth();
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="flex flex-col w-[220px] min-h-screen py-6 px-4 shrink-0" style={{ background: "var(--ink)", borderRight: "1.5px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2.5 mb-10 px-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center font-black text-xs" style={{ background: "var(--accent)", color: "var(--ink)" }}>L</div>
        <span className="font-bold text-sm text-white tracking-tight">Lumina BI</span>
      </div>

      <p className="text-xs font-semibold tracking-widest uppercase px-2 mb-3" style={{ color: "rgba(255,255,255,0.25)" }}>Platform</p>

      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map(({ to, icon, label, phase }) => (
          <NavLink key={to} to={to} end={to === "/dashboard"}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? "text-white" : "hover:bg-white/5"}`}
            style={({ isActive }) => isActive ? { background: "rgba(200,240,77,0.12)", color: "var(--accent)" } : { color: "rgba(255,255,255,0.45)" }}>
            <span className="text-base w-5 text-center">{icon}</span>
            <span className="flex-1">{label}</span>
            {phase && <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)", fontSize: "9px" }}>{phase}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--accent)", color: "var(--ink)" }}>
            {user?.full_name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name ?? "—"}</p>
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{user?.email ?? "—"}</p>
          </div>
        </div>
        <button onClick={signOut} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all hover:bg-white/5" style={{ color: "rgba(255,255,255,0.35)" }}>
          ← Sign out
        </button>
      </div>
    </aside>
  );
}
