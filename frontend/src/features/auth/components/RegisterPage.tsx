import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";

import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { useAuth } from "@/features/auth/hooks/useAuth";

const schema = z.object({
  full_name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser, loading, error } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <AuthLayout heading="Create your account" subheading="Start your SynaptiqBI workspace today">
      <form onSubmit={handleSubmit(registerUser)} className="flex flex-col gap-4">
        {error && <div className="animate-fade-up"><Alert message={error} /></div>}
        <div className="animate-fade-up-1">
          <FormField label="Full name" type="text" placeholder="Salankara Ray" error={errors.full_name?.message} {...register("full_name")} />
        </div>
        <div className="animate-fade-up-2">
          <FormField label="Work email" type="email" placeholder="you@company.com" error={errors.email?.message} {...register("email")} />
        </div>
        <div className="animate-fade-up-3">
          <FormField label="Password" type="password" placeholder="Min. 8 characters" error={errors.password?.message} {...register("password")} />
        </div>
        <div className="animate-fade-up-4 pt-1">
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Creating account…
              </span>
            ) : "Create account →"}
          </button>
        </div>
        <p className="text-xs text-center animate-fade-up-4" style={{ color: "var(--muted)" }}>
          By continuing you agree to our{" "}
          <span className="underline underline-offset-2 cursor-pointer">Terms</span> and{" "}
          <span className="underline underline-offset-2 cursor-pointer">Privacy Policy</span>.
        </p>
        <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold underline underline-offset-2" style={{ color: "var(--ink)" }}>Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
