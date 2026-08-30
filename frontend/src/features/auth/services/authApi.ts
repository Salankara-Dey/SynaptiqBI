import api from "@/services/api";

export interface RegisterPayload { email: string; full_name: string; password: string; }
export interface LoginPayload { email: string; password: string; }

export const authService = {
  register: (data: RegisterPayload) => api.post("/auth/register", data),

  login: (data: LoginPayload) =>
    api.post<{ access_token: string; refresh_token: string }>("/auth/login", data),

  me: () => api.get<{ user: { id: string; email: string; full_name: string } }>("/auth/me"),

  /** Rotate the refresh token — returns a new access + refresh pair. */
  refresh: (refresh_token: string) =>
    api.post<{ access_token: string; refresh_token: string }>("/auth/refresh", { refresh_token }),

  /** Revoke the refresh token on the server (single-device logout). */
  logout: (refresh_token: string) =>
    api.post("/auth/logout", { refresh_token }),
};
