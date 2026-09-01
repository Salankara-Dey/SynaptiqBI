import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/features/auth/services/authApi";
import { datasetsApi } from "@/features/datasets/services/datasetsApi";

export default function DashboardOverview() {
  const { user, setUser } = useAuthStore();
  const [datasetCount, setDatasetCount] = useState<number | null>(null);
  const [readyCount, setReadyCount] = useState<number | null>(null);

  useEffect(() => {
    authService.me().then((res) => setUser(res.data.user)).catch(() => {});
    datasetsApi
      .list()
      .then((res) => {
        setDatasetCount(res.data.total);
        setReadyCount(res.data.datasets.filter((d) => d.status === "ready").length);
      })
      .catch(() => {});
  }, [setUser]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const STATS = [
    {
      label: "Active Datasets",
      value: datasetCount !== null ? String(datasetCount) : "—",
      sub: readyCount !== null ? `${readyCount} clean & indexed` : "Loading workspace data",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      live: datasetCount !== null,
    },
    {
      label: "Analytics Studio",
      value: readyCount !== null && readyCount > 0 ? "Active" : "Ready",
      sub: "Aggregations · Correlation Matrix",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      live: readyCount !== null && readyCount > 0,
    },
    {
      label: "AI Intelligence",
      value: "Enabled",
      sub: "LLM Insights · NL→SQL · Prophet",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      live: true,
    },
    {
      label: "Workflow Engine",
      value: "Live",
      sub: "n8n Webhooks · Power BI Direct",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      live: true,
    },
  ];

  const CAPABILITIES = [
    {
      title: "Datasets & Automated ETL",
      desc: "Upload raw CSV/XLSX. Automated 6-stage pipeline handles cleaning, whitespace stripping, and column profiling.",
      to: "/dashboard/datasets",
      tag: "ETL Pipeline",
      cta: "Manage Datasets",
    },
    {
      title: "Analytics & Charting Studio",
      desc: "Interactive visual charts, grouped aggregations, numerical statistics, and dynamic Pearson correlation heatmaps.",
      to: "/dashboard/analytics",
      tag: "Visual BI",
      cta: "Open Analytics",
    },
    {
      title: "AI Insights Engine",
      desc: "Automated statistical pattern discovery, anomaly detection, data quality metrics, and structured AI recommendations.",
      to: "/dashboard/insights",
      tag: "LLM Analysis",
      cta: "Generate Insights",
    },
    {
      title: "Natural Language Query",
      desc: "Ask complex analytical questions in natural English. AI translates prompts directly into aggregate data queries.",
      to: "/dashboard/query",
      tag: "NL→Query",
      cta: "Ask Question",
    },
    {
      title: "Time-Series Forecasting",
      desc: "Exponential smoothing and trend projection with configurable frequencies and AI-generated narrative summaries.",
      to: "/dashboard/forecasts",
      tag: "Predictive",
      cta: "Run Forecast",
    },
    {
      title: "n8n Automation & Power BI",
      desc: "Trigger external webhooks on data events or embed live Power BI dashboards directly into your workspace.",
      to: "/dashboard/automation",
      tag: "Workflows",
      cta: "Configure Workflows",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-black/10">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase mb-1 text-neutral-500">
            {greeting}, {user?.full_name?.split(" ")[0] ?? "Executive"}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Executive Intelligence Hub
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            SynaptiqBI Autonomous Analytics Platform — All modules operational.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard/datasets" className="btn-primary">
            + Upload New Dataset
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS.map(({ label, value, sub, icon, live }, i) => (
          <div
            key={label}
            className="card p-5 animate-fade-up relative overflow-hidden group"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-900 text-lime-400 flex items-center justify-center shadow-sm">
                {icon}
              </div>
              <span
                className={`text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
                  live ? "bg-lime-400/20 text-lime-800 border border-lime-500/30" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {live ? "● Live" : "Standby"}
              </span>
            </div>
            <p className="text-2xl font-black tracking-tight text-slate-900 mb-0.5">{value}</p>
            <p className="text-xs font-bold text-slate-700">{label}</p>
            <p className="text-[11px] text-neutral-500 mt-1 truncate">{sub}</p>
          </div>
        ))}
      </div>

      {/* Platform capabilities grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Platform Suite & Capabilities</h2>
            <p className="text-xs text-neutral-500">Access end-to-end data processing, analytics, and intelligence tools.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CAPABILITIES.map((cap, i) => (
            <div
              key={cap.title}
              className="card-interactive p-6 flex flex-col justify-between animate-fade-up"
              style={{ animationDelay: `${0.1 + i * 0.04}s` }}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded bg-neutral-100 text-slate-700">
                    {cap.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{cap.title}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">{cap.desc}</p>
              </div>

              <Link
                to={cap.to}
                className="inline-flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-lime-600 transition-colors pt-4 border-t border-neutral-100"
              >
                <span>{cap.cta}</span>
                <span className="text-sm transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
