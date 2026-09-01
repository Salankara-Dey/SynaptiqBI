import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  heading: string;
  subheading: string;
}
const GRID_DOTS = Array.from({ length: 180 });

export function AuthLayout({ children, heading, subheading }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex selection:bg-lime-300 selection:text-black" style={{ background: "var(--surface)" }}>
      {/* Left hero banner */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] p-14 relative overflow-hidden" style={{ background: "#0B0D12" }}>
        {/* Dot pattern background */}
        <div className="absolute inset-0 grid grid-cols-12 gap-5 p-10 opacity-15">
          {GRID_DOTS.map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-lime-400" />
          ))}
        </div>
        <div
          className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: "var(--accent)" }}
        />

        {/* Top logo */}
        <div className="relative z-10 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-md" style={{ background: "var(--accent)", color: "#0B0D12" }}>
              S
            </div>
            <span className="text-white font-extrabold text-lg tracking-tight">SynaptiqBI</span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 max-w-lg">
          <p className="text-[10px] font-extrabold tracking-widest uppercase mb-4 text-lime-400">
            AUTONOMOUS BI & INTELLIGENCE
          </p>
          <h1 className="text-4xl font-extrabold leading-tight text-white mb-4 animate-fade-up-1">
            Accelerating growth through data intelligence.
          </h1>
          <p className="text-xs leading-relaxed text-neutral-400 mb-8 animate-fade-up-2">
            Ingest spreadsheets, run automated ETL pipelines, discover AI statistical insights, and trigger workflow automations — all in one platform.
          </p>
          <div className="flex gap-8 border-t border-neutral-800 pt-6 animate-fade-up-3">
            {[
              ["10x", "Insight Discovery"],
              ["99.9%", "Pipeline Reliability"],
              ["Zero", "SQL Knowledge Required"],
            ].map(([val, lbl]) => (
              <div key={lbl}>
                <p className="text-lg font-black text-lime-400">{val}</p>
                <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mt-0.5">{lbl}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-[11px] font-mono text-neutral-500">
          SynaptiqBI Autonomous Business Intelligence Engine
        </div>
      </div>

      {/* Right form area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-md" style={{ background: "#0B0D12", color: "var(--accent)" }}>
            S
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900">SynaptiqBI</span>
        </div>
        <div className="w-full max-w-[420px] card p-8 shadow-md">
          <div className="mb-6 animate-fade-up">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">{heading}</h2>
            <p className="text-xs text-neutral-500">{subheading}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
