import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { authService, LoginPayload, RegisterPayload } from "@/features/auth/services/authApi";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTokens, setUser, logout, refreshToken } = useAuthStore();
  const navigate = useNavigate();

  const extractError = (e: any, fallback: string) => {
    const detail = e.response?.data?.detail;
    if (!detail) return e.message || fallback;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((item: any) => item.msg || JSON.stringify(item)).join(", ");
    }
    return JSON.stringify(detail);
  };

  const login = async (data: LoginPayload) => {
    setLoading(true); setError(null);
    try {
      const res = await authService.login(data);
      setTokens(res.data.access_token, res.data.refresh_token);
      const me = await authService.me();
      setUser(me.data.user);
      navigate("/dashboard");
    } catch (e: any) { setError(extractError(e, "Login failed")); }
    finally { setLoading(false); }
  };

  const register = async (data: RegisterPayload) => {
    setLoading(true); setError(null);
    try {
      await authService.register(data);
      await login({ email: data.email, password: data.password });
    } catch (e: any) { setError(extractError(e, "Registration failed")); }
    finally { setLoading(false); }
  };

  const signOut = async () => {
    // Phase 7 gap fix: revoke refresh token on server before clearing local state
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // Best-effort — clear local state regardless
      }
    }
    logout();
    navigate("/login");
  };

  return { login, register, signOut, loading, error };
}
