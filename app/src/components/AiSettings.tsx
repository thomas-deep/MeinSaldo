"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import Toggle from "./Toggle";

interface AiSettingsState {
  ollamaEnabled: boolean;
  ollamaUrl: string;
  ollamaModel: string;
}

export default function AiSettings() {
  const [state, setState] = useState<AiSettingsState>({
    ollamaEnabled: false,
    ollamaUrl: "http://localhost:11434",
    ollamaModel: "",
  });
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/settings", { signal: ctrl.signal });
        const data = (await res.json()) as AiSettingsState;
        if (!ctrl.signal.aborted) setState(data);
      } catch (e) {
        if ((e as { name?: string })?.name !== "AbortError") {
          console.error("Settings load failed:", e);
        }
      }
    })();
    return () => ctrl.abort();
  }, []);

  const save = useCallback(async (next: Partial<AiSettingsState>) => {
    const merged = { ...state, ...next };
    setState(merged);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
    });
  }, [state]);

  const testConnection = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(
        `/api/ai/models?url=${encodeURIComponent(state.ollamaUrl)}`
      );
      const data = await res.json();
      if (res.ok) {
        const modelNames: string[] = (data.models ?? []).map(
          (m: { name: string }) => m.name
        );
        setModels(modelNames);
        setStatus("ok");
        if (!state.ollamaModel && modelNames.length > 0) {
          await save({ ollamaModel: modelNames[0] });
        }
      } else {
        setStatus("error");
        setErrorMsg(data.error || "unbekannter Fehler");
      }
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "unbekannter Fehler");
    }
  }, [state.ollamaUrl, state.ollamaModel, save]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50">
      <div className="border-b border-slate-700 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-200">
              KI-Kategorisierung (Ollama)
            </h3>
            <p className="text-xs text-slate-500">
              Buchungen mit Kategorie &bdquo;Sonstiges&ldquo; durch ein lokales
              LLM klassifizieren lassen.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <Toggle
          checked={state.ollamaEnabled}
          onChange={(v) => save({ ollamaEnabled: v })}
          accent="purple"
          label={
            <span className="text-sm text-slate-200">
              Ollama-Integration aktivieren
            </span>
          }
        />

        <div>
          <label className="mb-1.5 block text-xs text-slate-400">
            Ollama-URL
          </label>
          <input
            type="text"
            value={state.ollamaUrl}
            onChange={(e) => save({ ollamaUrl: e.target.value })}
            placeholder="http://localhost:11434"
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Standard ist <code className="font-mono">http://localhost:11434</code>{" "}
            wenn Ollama lokal läuft.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <button
            onClick={testConnection}
            disabled={status === "loading"}
            className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm font-medium text-slate-200 hover:border-purple-500 hover:text-purple-300 disabled:opacity-50 cursor-pointer"
          >
            {status === "loading" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Verbindung testen & Modelle laden
          </button>
          {status === "ok" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Verbindung OK ({models.length} Modelle)
            </span>
          )}
          {status === "error" && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <XCircle className="h-4 w-4" />
              {errorMsg}
            </span>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-slate-400">Modell</label>
          {models.length > 0 ? (
            <select
              value={state.ollamaModel}
              onChange={(e) => save({ ollamaModel: e.target.value })}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200"
            >
              <option value="">— wählen —</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={state.ollamaModel}
              onChange={(e) => save({ ollamaModel: e.target.value })}
              placeholder="z.B. llama3.2:3b oder qwen2.5:7b"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500"
            />
          )}
          <p className="mt-1 text-xs text-slate-500">
            Empfehlung: <code className="font-mono">llama3.2:3b</code> (schnell)
            oder <code className="font-mono">qwen2.5:7b</code> (genauer).
          </p>
        </div>
      </div>
    </div>
  );
}
