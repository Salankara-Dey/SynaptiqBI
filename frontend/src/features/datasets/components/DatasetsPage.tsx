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
        setPollingIds((prev) => {
          const s = new Set(prev);
          s.delete(ds.id);
          return s;
        });
        refetch();
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this dataset and all its rows?")) return;
    await remove(id);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-black/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded bg-neutral-900 text-lime-400">
            DATA PIPELINE
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Datasets & Ingestion</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Upload CSV or XLSX spreadsheets. Automated 6-stage ETL handles cleaning, coercion, deduplication, and column profiling.
        </p>
      </div>

      {/* Upload dropzone container */}
      <div className="mb-8 animate-fade-up">
        <UploadDropzone onUploaded={handleUploaded} />
      </div>

      {/* Pipeline features explanation */}
      {datasets.length === 0 && !loading && (
        <div className="card p-6 mb-8 animate-fade-up-1">
          <p className="text-xs font-bold tracking-wider uppercase mb-4 text-neutral-500">Automated ETL Pipeline Architecture</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              ["1", "Strip Whitespace", "Normalize string values & trim padding"],
              ["2", "Type Inference", "Coerce numeric, boolean & ISO datetimes"],
              ["3", "Null Thresholds", "Filter and impute missing data cells"],
              ["4", "Deduplication", "Identify & remove duplicate row hashes"],
              ["5", "Profiling Engine", "Calculate summary metrics per column"],
            ].map(([num, label, desc]) => (
              <div key={num} className="p-3.5 rounded-xl border border-black/5 bg-slate-50/50 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded bg-neutral-900 text-lime-400 flex items-center justify-center text-[10px] font-black shrink-0">
                    {num}
                  </span>
                  <p className="text-xs font-bold text-slate-900 truncate">{label}</p>
                </div>
                <p className="text-[11px] text-neutral-500 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl mb-6 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
          {error}
        </div>
      )}

      {/* Datasets list section */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 h-44 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : datasets.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Workspace Datasets ({datasets.length})
              {pollingIds.size > 0 && (
                <span className="ml-3 text-[10px] px-2.5 py-0.5 rounded-full bg-lime-400/20 text-lime-800 border border-lime-500/30">
                  ● Processing {pollingIds.size} pipeline run{pollingIds.size > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((ds, i) => (
              <div key={ds.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
                <DatasetCard dataset={ds} onDelete={handleDelete} onClick={setSelectedId} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card p-12 text-center flex flex-col items-center border-dashed border-2">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-900">No datasets uploaded yet</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm">
            Drag and drop a CSV or Excel spreadsheet into the upload area above to begin analysis.
          </p>
        </div>
      )}

      {selectedId && <DatasetDetailModal datasetId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
