import { useState } from "react";
import { UploadDropzone } from "./UploadDropzone";
import { DatasetCard } from "./DatasetCard";
import { DatasetDetailModal } from "./DatasetDetailModal";
import { useDatasets } from "@/features/datasets/hooks/useDatasets";
import { Dataset } from "@/features/datasets/services/datasetsApi";

export default function DatasetsPage() {
  const { datasets, loading, error, remove, pollUntilReady, refetch } = useDatasets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());

  const handleUploaded = (ds: Dataset) => {
    refetch();
    if (ds.status === "pending" || ds.status === "running") {
      setPollingIds((prev) => new Set(prev).add(ds.id));
      pollUntilReady(ds.id, () => {
        setPollingIds((prev) => { const s = new Set(prev); s.delete(ds.id); return s; });
        refetch();
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this dataset and all its rows?")) return;
    await remove(id);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Phase 2</p>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>Datasets</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Upload CSV or XLSX files. ETL runs automatically — cleaning, typing, and profiling your data.</p>
      </div>

      <div className="mb-8 animate-fade-up">
        <UploadDropzone onUploaded={handleUploaded} />
      </div>

      {datasets.length === 0 && !loading && (
        <div className="card p-5 mb-8 animate-fade-up-1">
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--muted)" }}>ETL Pipeline Steps</p>
          <div className="flex flex-wrap gap-2">
            {[
              ["1", "Strip Whitespace", "Normalize string columns"],
              ["2", "Type Inference", "Coerce numeric & datetime"],
              ["3", "Null Handling", "Fill or drop by threshold"],
              ["4", "Deduplication", "Remove exact duplicate rows"],
              ["5", "Profiler", "Compute stats per column"],
            ].map(([num, label, desc]) => (
              <div key={num} className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "var(--surface)" }}>
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-black shrink-0" style={{ background: "var(--ink)", color: "var(--accent)" }}>{num}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{label}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-center py-8" style={{ color: "var(--danger)" }}>{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="card p-5 h-48 animate-pulse" style={{ background: "var(--surface-2)" }} />)}
        </div>
      ) : datasets.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
              {datasets.length} dataset{datasets.length !== 1 ? "s" : ""}
              {pollingIds.size > 0 && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(79,110,247,0.1)", color: "#4f6ef7" }}>● {pollingIds.size} processing</span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((ds, i) => (
              <div key={ds.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <DatasetCard dataset={ds} onDelete={handleDelete} onClick={setSelectedId} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: "var(--muted)" }}>
          <span className="text-4xl mb-4">⊞</span>
          <p className="text-sm font-semibold">No datasets yet</p>
          <p className="text-xs mt-1">Upload your first CSV or XLSX above</p>
        </div>
      )}

      {selectedId && <DatasetDetailModal datasetId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
