import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/features/auth/services/authApi";

const api = axios.create({ baseURL: "/api/v1", headers: { "Content-Type": "application/json" } });

// ── Request: attach access token ──────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: silent token refresh on 401 ─────────────────────────────────────
let _refreshing = false;
let _refreshQueue: Array<(token: string) => void> = [];

function _drainQueue(newToken: string) {
  _refreshQueue.forEach((cb) => cb(newToken));
  _refreshQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Only intercept 401s that haven't already been retried
    if (error.response?.status === 401 && !original._retry) {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      // If there's no refresh token, bail out immediately
      if (!refreshToken) {
        logout();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // If a refresh is already in flight, queue this request
      if (_refreshing) {
        return new Promise((resolve) => {
          _refreshQueue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      original._retry = true;
      _refreshing = true;

      try {
        const { data } = await authService.refresh(refreshToken);
        setTokens(data.access_token, data.refresh_token);
        _drainQueue(data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        // Refresh failed — log out completely
        logout();
        window.location.href = "/login";
        return Promise.reject(error);
      } finally {
        _refreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
