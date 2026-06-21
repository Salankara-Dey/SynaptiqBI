import api from "@/services/api";

export interface RegisterPayload { email: string; full_name: string; password: string; }
export interface LoginPayload { email: string; password: string; }

export const authService = {
  register: (data: RegisterPayload) => api.post("/auth/register", data),
  login: (data: LoginPayload) => api.post<{ access_token: string; refresh_token: string }>("/auth/login", data),
  me: () => api.get<{ user: { id: string; email: string; full_name: string } }>("/auth/me"),
};
