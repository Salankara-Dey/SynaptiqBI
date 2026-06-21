import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";

import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { useAuth } from "@/features/auth/hooks/useAuth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <AuthLayout heading="Welcome back" subheading="Sign in to your Lumina workspace">
      <form onSubmit={handleSubmit(login)} className="flex flex-col gap-4">
        {error && <div className="animate-fade-up"><Alert message={error} /></div>}
        <div className="animate-fade-up-1">
          <FormField label="Email" type="email" placeholder="you@company.com" error={errors.email?.message} {...register("email")} />
        </div>
        <div className="animate-fade-up-2">
          <FormField label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register("password")} />
        </div>
        <div className="animate-fade-up-3 pt-1">
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Signing in…
              </span>
            ) : "Sign in →"}
          </button>
        </div>
        <p className="text-center text-sm animate-fade-up-4" style={{ color: "var(--muted)" }}>
          No account?{" "}
          <Link to="/register" className="font-semibold underline underline-offset-2" style={{ color: "var(--ink)" }}>Create one</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
