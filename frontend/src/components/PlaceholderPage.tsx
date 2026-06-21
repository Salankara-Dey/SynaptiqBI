interface PlaceholderProps { title: string; phase: string; description: string; icon: string; }

export function PlaceholderPage({ title, phase, description, icon }: PlaceholderProps) {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] animate-fade-in">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6" style={{ background: "var(--surface-2)" }}>
        {icon}
      </div>
      <span className="text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
        style={{ background: "rgba(200,240,77,0.12)", color: "var(--accent-dim)", border: "1px solid rgba(200,240,77,0.25)" }}>
        {phase}
      </span>
      <h2 className="text-2xl font-extrabold mb-2 text-center" style={{ color: "var(--ink)" }}>{title}</h2>
      <p className="text-sm text-center max-w-xs" style={{ color: "var(--muted)" }}>{description}</p>
    </div>
  );
}
