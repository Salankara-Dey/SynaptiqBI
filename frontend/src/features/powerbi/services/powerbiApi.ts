import api from "@/services/api";

export interface PowerBIReport {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string;
  report_id: string;
  dataset_id: string | null;
  embed_url: string | null;
  is_active: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmbedToken {
  report_id: string;
  embed_url: string;
  embed_token: string;
  token_expiry: string;
  cached: boolean;
}

export interface CreateReportRequest {
  name: string;
  description?: string;
  workspace_id: string;
  report_id: string;
  dataset_id?: string;
  organization_id?: string;
}

export interface PBIStatus {
  configured: boolean;
  message: string;
}

export const powerbiApi = {
  status: () => api.get<PBIStatus>("/powerbi/status"),
  list: () => api.get<PowerBIReport[]>("/powerbi/reports"),
  create: (body: CreateReportRequest) => api.post<PowerBIReport>("/powerbi/reports", body),
  delete: (id: string) => api.delete(`/powerbi/reports/${id}`),
  getEmbedToken: (id: string) => api.post<EmbedToken>(`/powerbi/reports/${id}/embed-token`, {}),
};
