import api from "@/services/api";

export interface Dataset {
  id: string;
  name: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  raw_row_count: number | null;
  raw_col_count: number | null;
  raw_columns: string[] | null;
  status: "pending" | "running" | "ready" | "failed";
  clean_row_count: number | null;
  column_types: Record<string, string> | null;
  profile: Record<string, any> | null;
  etl_error: string | null;
  created_at: string;
}

export interface DatasetListResponse { datasets: Dataset[]; total: number; }
export interface DatasetRowsResponse {
  dataset_id: string; rows: Record<string, any>[]; limit: number; offset: number; total_clean_rows: number | null;
}

export const datasetsApi = {
  upload: (file: File, name: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("name", name);
    return api.post<Dataset>("/datasets/", form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  list: () => api.get<DatasetListResponse>("/datasets/"),
  get: (id: string) => api.get<Dataset>(`/datasets/${id}`),
  rows: (id: string, limit = 100, offset = 0) => api.get<DatasetRowsResponse>(`/datasets/${id}/rows?limit=${limit}&offset=${offset}`),
  delete: (id: string) => api.delete(`/datasets/${id}`),
};
