import { useState, useEffect, useCallback } from "react";
import { datasetsApi, Dataset } from "@/features/datasets/services/datasetsApi";

export function useDatasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await datasetsApi.list();
      setDatasets(res.data.datasets);
    } catch { setError("Failed to load datasets"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const remove = async (id: string) => {
    await datasetsApi.delete(id);
    setDatasets((prev) => prev.filter((d) => d.id !== id));
  };

  const pollUntilReady = useCallback((id: string, onDone: (ds: Dataset) => void) => {
    const interval = setInterval(async () => {
      try {
        const res = await datasetsApi.get(id);
        const ds = res.data;
        if (ds.status === "ready" || ds.status === "failed") {
          clearInterval(interval);
          setDatasets((prev) => prev.map((d) => (d.id === id ? ds : d)));
          onDone(ds);
        }
      } catch { clearInterval(interval); }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return { datasets, loading, error, refetch: fetch, remove, pollUntilReady };
}
