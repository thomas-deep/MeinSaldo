"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface AiCategorizeButtonProps {
  onDone: () => void;
}

export default function AiCategorizeButton({ onDone }: AiCategorizeButtonProps) {
  const [enabled, setEnabled] = useState(false);
  const [model, setModel] = useState("");
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [progress, setProgress] = useState<{ done: number; total: number; matched: number } | null>(null);

  const refresh = useCallback(async () => {
    const [settingsRes, idsRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/ai/categorize"),
    ]);
    const settings = await settingsRes.json();
    const ids = await idsRes.json();
    setEnabled(settings.ollamaEnabled && !!settings.ollamaModel);
    setModel(settings.ollamaModel || "");
    setUncategorizedCount(ids.count ?? 0);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount
    refresh();
  }, [refresh]);

  const run = useCallback(async () => {
    const idsRes = await fetch("/api/ai/categorize");
    const idsData = await idsRes.json();
    const allIds: string[] = idsData.ids ?? [];
    if (allIds.length === 0) return;

    const BATCH = 3;
    let done = 0;
    let matched = 0;
    setProgress({ done: 0, total: allIds.length, matched: 0 });

    for (let i = 0; i < allIds.length; i += BATCH) {
      const slice = allIds.slice(i, i + BATCH);
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: slice }),
      });
      if (!res.ok) break;
      const data = (await res.json()) as {
        results: { kategorie: string | null }[];
      };
      done += slice.length;
      matched += data.results.filter((r) => r.kategorie !== null).length;
      setProgress({ done, total: allIds.length, matched });
    }

    setProgress(null);
    onDone();
    refresh();
  }, [onDone, refresh]);

  if (!enabled || uncategorizedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/5 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <div className="text-xs">
          <p className="font-medium text-purple-200">
            {uncategorizedCount} Buchungen ohne klare Kategorie
          </p>
          <p className="text-purple-300/60">
            Mit {model} klassifizieren lassen
          </p>
        </div>
      </div>
      <div className="flex-1" />
      {progress ? (
        <div className="flex items-center gap-3 text-xs">
          <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
          <span className="text-purple-200">
            {progress.done} / {progress.total} – {progress.matched} erkannt
          </span>
        </div>
      ) : (
        <button
          onClick={run}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Mit KI kategorisieren
        </button>
      )}
    </div>
  );
}
