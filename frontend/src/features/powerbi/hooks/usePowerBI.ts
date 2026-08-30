import { useState, useEffect, useCallback } from "react";
import {
  powerbiApi,
  PowerBIReport,
  EmbedToken,
  CreateReportRequest,
  PBIStatus,
} from "@/features/powerbi/services/powerbiApi";

export function usePowerBI() {
  const [reports, setReports] = useState<PowerBIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PBIStatus | null>(null);

  // Embed viewer state
  const [embedToken, setEmbedToken] = useState<EmbedToken | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, reportsRes] = await Promise.all([
        powerbiApi.status(),
        powerbiApi.list(),
      ]);
      setStatus(statusRes.data);
      setReports(reportsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load Power BI data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (body: CreateReportRequest) => {
    const r = await powerbiApi.create(body);
    setReports((prev) => [r.data, ...prev]);
    return r.data;
  }, []);

  const remove = useCallback(async (id: string) => {
    await powerbiApi.delete(id);
    setReports((prev) => prev.filter((r) => r.id !== id));
    if (activeReportId === id) {
      setActiveReportId(null);
      setEmbedToken(null);
    }
  }, [activeReportId]);

  const openReport = useCallback(async (id: string) => {
    setActiveReportId(id);
    setEmbedLoading(true);
    setEmbedToken(null);
    setError(null);
    try {
      const r = await powerbiApi.getEmbedToken(id);
      setEmbedToken(r.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to get embed token");
    } finally {
      setEmbedLoading(false);
    }
  }, []);

  const closeEmbed = useCallback(() => {
    setActiveReportId(null);
    setEmbedToken(null);
  }, []);

  return {
    reports,
    loading,
    error,
    status,
    load,
    create,
    remove,
    // Embed
    activeReportId,
    embedToken,
    embedLoading,
    openReport,
    closeEmbed,
  };
}
