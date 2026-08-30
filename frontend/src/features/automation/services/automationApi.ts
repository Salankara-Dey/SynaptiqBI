import api from "@/services/api";

export type AutomationEventType =
  | "dataset_uploaded"
  | "dataset_ready"
  | "insight_generated";

export type AutomationRunStatus =
  | "pending"
  | "running"
  | "success"
  | "failed";

export interface Automation {
  id: string;
  name: string;
  description: string | null;
  event_type: AutomationEventType;
  webhook_url: string;
  headers: Record<string, string> | null;
  is_active: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRun {
  id: string;
  automation_id: string;
  status: AutomationRunStatus;
  event_type: string;
  trigger_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  http_status_code: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CreateAutomationRequest {
  name: string;
  description?: string;
  event_type: AutomationEventType;
  webhook_url: string;
  headers?: Record<string, string>;
  organization_id?: string;
}

export interface UpdateAutomationRequest {
  name?: string;
  description?: string;
  webhook_url?: string;
  headers?: Record<string, string>;
  is_active?: boolean;
}

export const automationApi = {
  list: () => api.get<Automation[]>("/automations/"),

  get: (id: string) => api.get<Automation>(`/automations/${id}`),

  create: (body: CreateAutomationRequest) =>
    api.post<Automation>("/automations/", body),

  update: (id: string, body: UpdateAutomationRequest) =>
    api.patch<Automation>(`/automations/${id}`, body),

  delete: (id: string) => api.delete(`/automations/${id}`),

  getRuns: (id: string, limit = 50) =>
    api.get<AutomationRun[]>(`/automations/${id}/runs?limit=${limit}`),

  testWebhook: (id: string) =>
    api.post(`/automations/${id}/test`, {}),
};
