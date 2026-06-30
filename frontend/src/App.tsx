import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/features/dashboard/DashboardLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import LoginPage from "@/features/auth/components/LoginPage";
import RegisterPage from "@/features/auth/components/RegisterPage";
import DashboardOverview from "@/features/dashboard/DashboardOverview";
import DatasetsPage from "@/features/datasets/components/DatasetsPage";
import AnalyticsPage from "@/features/analytics/components/AnalyticsPage";
import InsightsPage from "@/features/intelligence/components/InsightsPage";
import NLQueryPage from "@/features/intelligence/components/NLQueryPage";
import ForecastPage from "@/features/intelligence/components/ForecastPage";

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
            <Route path="/dashboard/analytics"  element={<AnalyticsPage />} />
            <Route path="/dashboard/insights"   element={<InsightsPage />} />
            <Route path="/dashboard/query"      element={<NLQueryPage />} />
            <Route path="/dashboard/forecasts"  element={<ForecastPage />} />
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

