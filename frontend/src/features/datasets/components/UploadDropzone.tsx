import { useState, useRef, DragEvent } from "react";
import { datasetsApi, Dataset } from "@/features/datasets/services/datasetsApi";

interface UploadDropzoneProps {
  onUploaded: (ds: Dataset) => void;
}
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
    if (file.size > MAX_MB * 1024 * 1024) return `File exceeds ${MAX_MB} MB limit`;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) return "Only CSV and XLSX files allowed";
    return null;
  };

  const handleFile = (file: File) => {
    const err = validate(file);
    if (err) {
      setErrorMsg(err);
      setState("error");
      return;
    }
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
        setState("idle");
        setSelectedFile(null);
        setName("");
        setProgress(0);
        onUploaded(res.data);
      }, 700);
    } catch (e: any) {
      clearInterval(tick);
      setErrorMsg(e.response?.data?.detail ?? "Upload failed");
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setSelectedFile(null);
    setName("");
    setErrorMsg("");
  };
  const isDragging = state === "dragging";
  const isUploading = state === "uploading";

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setState("dragging");
          }}
          onDragLeave={() => setState("idle")}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="card relative flex flex-col items-center justify-center gap-3 p-10 cursor-pointer transition-all duration-200 border-2 border-dashed group hover:border-black/40 hover:bg-slate-50/50"
          style={{
            borderColor: isDragging ? "var(--ink)" : "rgba(11,13,18,0.15)",
            background: isDragging ? "rgba(200,240,77,0.1)" : "white",
          }}
        >
          <div
            className="w-12 h-12 rounded-xl bg-neutral-900 text-lime-400 flex items-center justify-center text-xl transition-transform group-hover:scale-110 shadow-sm"
          >
            {state === "error" ? (
              "✕"
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900">
              {isDragging ? "Drop spreadsheet to ingest" : "Upload Dataset File"}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Drag & drop CSV or XLSX file here, or <span className="font-bold underline text-slate-800">click to browse</span> (Max {MAX_MB} MB)
            </p>
            {state === "error" && (
              <p className="text-xs font-bold text-rose-600 mt-2">{errorMsg}</p>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      ) : (
        <div className="card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-900 text-lime-400 flex items-center justify-center text-xs font-black shrink-0">
              {selectedFile.name.split(".").pop()?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{selectedFile.name}</p>
              <p className="text-[11px] text-neutral-500 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            {!isUploading && (
              <button onClick={reset} className="text-xs font-bold text-neutral-400 hover:text-slate-900 p-1">
                ✕
              </button>
            )}
          </div>

          {!isUploading && (
            <input
              className="input-field"
              placeholder="Custom dataset name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}

          {isUploading && (
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-neutral-900 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          )}

          {!isUploading && (
            <button onClick={upload} className="btn-primary w-full">
              Upload & Run ETL Pipeline →
            </button>
          )}
          {isUploading && (
            <p className="text-xs text-center font-bold text-neutral-500 animate-pulse">
              Ingesting file and executing 6-stage ETL cleaning...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
