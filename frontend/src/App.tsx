import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/features/dashboard/DashboardLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import LoginPage from "@/features/auth/components/LoginPage";
import RegisterPage from "@/features/auth/components/RegisterPage";
import DashboardOverview from "@/features/dashboard/DashboardOverview";
import DatasetsPage from "@/features/datasets/components/DatasetsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard"            element={<DashboardOverview />} />
            <Route path="/dashboard/datasets"   element={<DatasetsPage />} />
            <Route path="/dashboard/insights"   element={
              <PlaceholderPage title="AI Insights" phase="Phase 4" icon="◎" description="LangChain-powered narrative insights from your data. Coming in Phase 4." />
            } />
            <Route path="/dashboard/query"      element={
              <PlaceholderPage title="Natural Language Query" phase="Phase 4" icon="⌘" description="Ask questions in plain English, get SQL results. Coming in Phase 4." />
            } />
            <Route path="/dashboard/forecasts"  element={
              <PlaceholderPage title="Forecasting" phase="Phase 4" icon="∿" description="Time-series forecasting with Prophet + AI narration. Coming in Phase 4." />
            } />
            <Route path="/dashboard/automation" element={
              <PlaceholderPage title="Automation" phase="Phase 5" icon="⟳" description="n8n workflow triggers and Power BI embed. Coming in Phase 5." />
            } />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
