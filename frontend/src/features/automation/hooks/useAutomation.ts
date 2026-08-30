import { useState, useEffect, useCallback } from "react";
import {
  automationApi,
  Automation,
  AutomationRun,
  CreateAutomationRequest,
  UpdateAutomationRequest,
} from "@/features/automation/services/automationApi";

export function useAutomation() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, "idle" | "sending" | "sent" | "error">>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await automationApi.list();
      setAutomations(r.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load automations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (body: CreateAutomationRequest) => {
    const r = await automationApi.create(body);
    setAutomations((prev) => [r.data, ...prev]);
    return r.data;
  }, []);

  const toggle = useCallback(async (id: string, isActive: boolean) => {
    const r = await automationApi.update(id, { is_active: isActive });
    setAutomations((prev) => prev.map((a) => (a.id === id ? r.data : a)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await automationApi.delete(id);
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setRuns([]);
    }
  }, [selectedId]);

  const loadRuns = useCallback(async (id: string) => {
    setSelectedId(id);
    setRunsLoading(true);
    try {
      const r = await automationApi.getRuns(id);
      setRuns(r.data);
    } catch {
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  }, []);

  const sendTest = useCallback(async (id: string) => {
    setTestStatus((p) => ({ ...p, [id]: "sending" }));
    try {
      await automationApi.testWebhook(id);
      setTestStatus((p) => ({ ...p, [id]: "sent" }));
      setTimeout(() => setTestStatus((p) => ({ ...p, [id]: "idle" })), 3000);
    } catch {
      setTestStatus((p) => ({ ...p, [id]: "error" }));
      setTimeout(() => setTestStatus((p) => ({ ...p, [id]: "idle" })), 3000);
    }
  }, []);

  return {
    automations,
    loading,
    error,
    load,
    create,
    toggle,
    remove,
    // Runs
    selectedId,
    runs,
    runsLoading,
    loadRuns,
    // Test
    testStatus,
    sendTest,
  };
}
