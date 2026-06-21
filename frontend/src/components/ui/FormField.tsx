import { forwardRef, InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
        {label}
      </label>
      <input ref={ref} className={`input-field ${error ? "error" : ""} ${className}`} {...props} />
      {error && <span className="text-xs font-medium" style={{ color: "var(--danger)" }}>{error}</span>}
    </div>
  )
);
FormField.displayName = "FormField";
