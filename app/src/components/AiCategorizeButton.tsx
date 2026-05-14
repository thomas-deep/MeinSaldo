"use client";

import { useCallback, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import {
  AiProgress,
  runAiOnAllUncategorized,
  useAiStatus,
} from "../lib/use-ai-categorize";

interface AiCategorizeButtonProps {
  onDone: () => void;
}

export default function AiCategorizeButton({ onDone }: AiCategorizeButtonProps) {
  const { status, refresh } = useAiStatus();
  const [progress, setProgress] = useState<AiProgress | null>(null);

  const run = useCallback(async () => {
    setProgress({ done: 0, total: status.uncategorizedCount, matched: 0 });
    await runAiOnAllUncategorized((p) => setProgress(p));
    setProgress(null);
    onDone();
    refresh();
  }, [onDone, refresh, status.uncategorizedCount]);

  if (!status.enabled || status.uncategorizedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/5 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <div className="text-xs">
          <p className="font-medium text-purple-200">
            {status.uncategorizedCount} Buchungen ohne klare Kategorie
          </p>
          <p className="text-purple-300/60">
            Mit {status.model} klassifizieren lassen
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
