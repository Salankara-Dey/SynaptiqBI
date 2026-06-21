import { useState, useRef, DragEvent } from "react";
import { datasetsApi, Dataset } from "@/features/datasets/services/datasetsApi";

interface UploadDropzoneProps { onUploaded: (ds: Dataset) => void; }
type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

const ACCEPT = ".csv,.xlsx,.xls";
const MAX_MB = 50;

export function UploadDropzone({ onUploaded }: UploadDropzoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [name, setName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    if (file.size > MAX_MB * 1024 * 1024) return `File exceeds ${MAX_MB} MB`;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) return "Only CSV and XLSX files allowed";
    return null;
  };

  const handleFile = (file: File) => {
    const err = validate(file);
    if (err) { setErrorMsg(err); setState("error"); return; }
    setSelectedFile(file);
    setName(file.name.replace(/\.[^.]+$/, ""));
    setState("idle");
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setState("idle");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const upload = async () => {
    if (!selectedFile) return;
    setState("uploading");
    setProgress(0);
    const tick = setInterval(() => setProgress((p) => Math.min(p + 8, 85)), 200);

    try {
      const res = await datasetsApi.upload(selectedFile, name || selectedFile.name);
      clearInterval(tick);
      setProgress(100);
      setState("success");
      setTimeout(() => {
        setState("idle"); setSelectedFile(null); setName(""); setProgress(0);
        onUploaded(res.data);
      }, 800);
    } catch (e: any) {
      clearInterval(tick);
      setErrorMsg(e.response?.data?.detail ?? "Upload failed");
      setState("error");
    }
  };

  const reset = () => { setState("idle"); setSelectedFile(null); setName(""); setErrorMsg(""); };
  const isDragging = state === "dragging";
  const isUploading = state === "uploading";

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setState("dragging"); }}
          onDragLeave={() => setState("idle")}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="relative flex flex-col items-center justify-center gap-3 p-10 rounded-xl cursor-pointer transition-all duration-200"
          style={{ border: `2px dashed ${isDragging ? "var(--ink)" : "var(--border)"}`, background: isDragging ? "rgba(200,240,77,0.06)" : "white" }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-transform"
            style={{ background: "var(--surface-2)", transform: isDragging ? "scale(1.1)" : "scale(1)" }}>
            {state === "error" ? "✕" : "↑"}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{isDragging ? "Drop to upload" : "Drag & drop or click to browse"}</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>CSV or XLSX · Max {MAX_MB} MB</p>
            {state === "error" && <p className="text-xs mt-2 font-medium" style={{ color: "var(--danger)" }}>{errorMsg}</p>}
          </div>
          <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      ) : (
        <div className="card p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
              {selectedFile.name.split(".").pop()?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--ink)" }}>{selectedFile.name}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            {!isUploading && <button onClick={reset} className="text-xs px-2 py-1 rounded" style={{ color: "var(--muted)" }}>✕</button>}
          </div>

          {!isUploading && (
            <input className="input-field text-sm" placeholder="Dataset name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          )}

          {isUploading && (
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: state === "success" ? "#4dcf7f" : "var(--ink)" }} />
            </div>
          )}

          {!isUploading && <button onClick={upload} className="btn-primary w-full">Upload & run ETL →</button>}
          {isUploading && <p className="text-xs text-center font-medium" style={{ color: "var(--muted)" }}>Uploading… ETL will run automatically</p>}
        </div>
      )}
    </div>
  );
}
