import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { authService, LoginPayload, RegisterPayload } from "@/features/auth/services/authApi";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTokens, setUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const login = async (data: LoginPayload) => {
    setLoading(true); setError(null);
    try {
      const res = await authService.login(data);
      setTokens(res.data.access_token, res.data.refresh_token);
      const me = await authService.me();
      setUser(me.data.user);
      navigate("/dashboard");
    } catch (e: any) { setError(e.response?.data?.detail ?? "Login failed"); }
    finally { setLoading(false); }
  };

  const register = async (data: RegisterPayload) => {
    setLoading(true); setError(null);
    try {
      await authService.register(data);
      await login({ email: data.email, password: data.password });
    } catch (e: any) { setError(e.response?.data?.detail ?? "Registration failed"); }
    finally { setLoading(false); }
  };

  const signOut = () => { logout(); navigate("/login"); };
  return { login, register, signOut, loading, error };
}
