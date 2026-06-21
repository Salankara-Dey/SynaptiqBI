import { ReactNode } from "react";

interface AuthLayoutProps { children: ReactNode; heading: string; subheading: string; }
const GRID_DOTS = Array.from({ length: 180 });

export function AuthLayout({ children, heading, subheading }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex" style={{ background: "var(--surface)" }}>
      <div className="hidden lg:flex flex-col justify-between w-[46%] p-12 relative overflow-hidden" style={{ background: "var(--ink)" }}>
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: "repeat(18, 1fr)", gap: "18px", padding: "40px", opacity: 0.15 }}>
          {GRID_DOTS.map((_, i) => <div key={i} className="w-1 h-1 rounded-full" style={{ background: "var(--accent)" }} />)}
        </div>
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl" style={{ background: "var(--accent)", opacity: 0.08, transform: "translate(-30%, 30%)" }} />

        <div className="relative z-10 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: "var(--accent)", color: "var(--ink)" }}>L</div>
            <span className="text-white font-bold text-lg tracking-tight">Lumina BI</span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs font-semibold tracking-widest uppercase mb-6 animate-fade-up-1" style={{ color: "var(--accent)" }}>AI-Powered Intelligence</p>
          <h1 className="text-4xl font-extrabold leading-tight text-white mb-5 animate-fade-up-2">Turn raw data<br />into decisions.</h1>
          <p className="text-sm leading-relaxed animate-fade-up-3" style={{ color: "rgba(255,255,255,0.5)" }}>
            Upload datasets, run ETL pipelines, generate AI insights, and automate workflows — all in one platform.
          </p>
          <div className="mt-10 flex gap-8 animate-fade-up-4">
            {[["10x", "Faster insights"], ["99.9%", "Uptime SLA"], ["SOC2", "Compliant"]].map(([val, lbl]) => (
              <div key={lbl}>
                <p className="text-xl font-black" style={{ color: "var(--accent)" }}>{val}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: "var(--ink)", color: "var(--accent)" }}>L</div>
          <span className="font-bold text-base tracking-tight" style={{ color: "var(--ink)" }}>Lumina BI</span>
        </div>
        <div className="w-full max-w-[400px]">
          <div className="mb-8 animate-fade-up">
            <h2 className="text-2xl font-extrabold tracking-tight mb-1.5" style={{ color: "var(--ink)" }}>{heading}</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{subheading}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
