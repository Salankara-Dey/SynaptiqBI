interface AlertProps { message: string; variant?: "error" | "success"; }

export function Alert({ message, variant = "error" }: AlertProps) {
  const colors = variant === "error"
    ? { bg: "#fff2f2", border: "#f04d4d", text: "#c0392b" }
    : { bg: "#f0fff4", border: "#4dcf7f", text: "#1a7a45" };

  return (
    <div className="px-4 py-3 rounded-[var(--radius)] text-sm font-medium animate-fade-in"
      style={{ background: colors.bg, border: `1.5px solid ${colors.border}`, color: colors.text }}>
      {message}
    </div>
  );
}
