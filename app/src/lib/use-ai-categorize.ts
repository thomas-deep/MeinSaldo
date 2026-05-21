"use client";

import { useCallback, useEffect, useState } from "react";

export interface AiStatus {
  enabled: boolean;
  model: string;
  uncategorizedCount: number;
}

export interface AiProgress {
  done: number;
  total: number;
  matched: number;
}

const BATCH = 3;

export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus>({
    enabled: false,
    model: "",
    uncategorizedCount: 0,
  });

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const [settingsRes, idsRes] = await Promise.all([
        fetch("/api/settings", { signal }),
        fetch("/api/ai/categorize", { signal }),
      ]);
      const settings = await settingsRes.json();
      const ids = await idsRes.json();
      if (signal?.aborted) return;
      setStatus({
        enabled: settings.ollamaEnabled && !!settings.ollamaModel,
        model: settings.ollamaModel || "",
        uncategorizedCount: ids.count ?? 0,
      });
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        console.error("AI status load failed:", e);
      }
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount mit Abort-Cleanup
    refresh(ctrl.signal);
    return () => ctrl.abort();
  }, [refresh]);

  return { status, refresh };
}

/**
 * Klassifiziert eine Liste von Transaction-IDs in Batches via Ollama.
 * Wenn `force=true`, wird `is_manual_override` ignoriert — sinnvoll für
 * benutzergewählte Mehrfach-Auswahl, wo das aktuelle Kategorisierungs-
 * Flag egal ist.
 */
export async function runAiOnIds(
  ids: string[],
  opts: {
    force?: boolean;
    onProgress?: (p: AiProgress) => void;
  } = {}
): Promise<AiProgress> {
  let done = 0;
  let matched = 0;
  const total = ids.length;
  opts.onProgress?.({ done, total, matched });

  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    const res = await fetch("/api/ai/categorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: slice, force: opts.force ?? false }),
    });
    if (!res.ok) break;
    const data = (await res.json()) as {
      results: { kategorie: string | null }[];
    };
    done += slice.length;
    matched += data.results.filter((r) => r.kategorie !== null).length;
    opts.onProgress?.({ done, total, matched });
  }
  return { done, total, matched };
}

/**
 * Standard-Lauf über alle uncategorized IDs. Lädt erst die ID-Liste vom
 * Server, fährt dann das Batch-Processing.
 */
export async function runAiOnAllUncategorized(
  onProgress?: (p: AiProgress) => void
): Promise<AiProgress> {
  const idsRes = await fetch("/api/ai/categorize");
  const idsData = await idsRes.json();
  const allIds: string[] = idsData.ids ?? [];
  return runAiOnIds(allIds, { onProgress });
}

/**
 * KI-Lauf nur über die uncategorized IDs aus einer gegebenen Menge — z. B.
 * direkt nach einem Import nur über die neu eingefügten Buchungen, die die
 * Regeln auf „Sonstiges" gelassen haben. Klassifiziert nicht den Rest der DB.
 */
export async function runAiOnUncategorizedAmong(
  ids: string[],
  onProgress?: (p: AiProgress) => void
): Promise<AiProgress> {
  const idsRes = await fetch("/api/ai/categorize");
  const idsData = await idsRes.json();
  const uncategorized = new Set<string>(idsData.ids ?? []);
  const target = ids.filter((id) => uncategorized.has(id));
  return runAiOnIds(target, { onProgress });
}
