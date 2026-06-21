import { Outlet } from "react-router-dom";
import { Sidebar } from "@/features/dashboard/Sidebar";

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--surface)" }}>
      <Sidebar />
      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  );
}
