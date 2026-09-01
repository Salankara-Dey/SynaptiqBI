import { NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

const NAV_GROUPS = [
  {
    title: "MAIN",
    items: [
      {
        to: "/dashboard",
        label: "Overview",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "ANALYTICS & DATA",
    items: [
      {
        to: "/dashboard/datasets",
        label: "Datasets & ETL",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ),
      },
      {
        to: "/dashboard/analytics",
        label: "Analytics Studio",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "AI INTELLIGENCE",
    items: [
      {
        to: "/dashboard/insights",
        label: "AI Insights",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        to: "/dashboard/query",
        label: "NL Query Engine",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        ),
      },
      {
        to: "/dashboard/forecasts",
        label: "Forecasting",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "AUTOMATION & EMBED",
    items: [
      {
        to: "/dashboard/automation",
        label: "n8n Workflows",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
      },
      {
        to: "/dashboard/powerbi",
        label: "Power BI Embedded",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
    ],
  },
];

export function Sidebar() {
  const { signOut } = useAuth();
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="flex flex-col w-[240px] min-h-screen py-6 px-4 shrink-0 selection:bg-lime-300 selection:text-black" style={{ background: "#0B0D12", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Brand logo */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow-md" style={{ background: "var(--accent)", color: "#0B0D12" }}>
          S
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-sm text-white tracking-tight leading-none">SynaptiqBI</span>
          <span className="text-[10px] font-semibold text-neutral-400 tracking-wider uppercase mt-1">Enterprise AI Hub</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-6 flex-1 overflow-y-auto pr-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-1">
            <p className="text-[10px] font-extrabold tracking-widest uppercase px-3 mb-1 text-neutral-500">
              {group.title}
            </p>
            {group.items.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/dashboard"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group ${
                    isActive ? "text-white" : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]"
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        background: "rgba(200,240,77,0.12)",
                        color: "var(--accent)",
                        borderLeft: "2px solid var(--accent)",
                      }
                    : {}
                }
              >
                <span className="transition-transform duration-200 group-hover:scale-110">{icon}</span>
                <span className="flex-1 truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User profile footer */}
      <div className="mt-6 border-t border-neutral-800 pt-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-lime-400/30" style={{ background: "var(--accent)", color: "#0B0D12" }}>
            {user?.full_name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{user?.full_name ?? "User"}</p>
            <p className="text-[10px] text-neutral-400 truncate">{user?.email ?? "active@synaptiq.ai"}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
