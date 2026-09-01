import { forwardRef, InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
        {label}
      </label>
      <input ref={ref} className={`input-field font-semibold text-slate-900 ${error ? "error" : ""} ${className}`} {...props} />
      {error && <span className="text-xs font-bold text-rose-600 mt-0.5">{error}</span>}
    </div>
  )
);
FormField.displayName = "FormField";
