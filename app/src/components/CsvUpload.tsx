"use client";

import { Upload, AlertCircle, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { Kontogruppe } from "../lib/types";
import { useAiStatus } from "../lib/use-ai-categorize";
import Toggle from "./Toggle";

export type EncodingChoice = "auto" | "utf-8" | "windows-1252";
const ENCODINGS: EncodingChoice[] = ["auto", "utf-8", "windows-1252"];

export type AiImportMode = "none" | "rulesThenAi" | "allAi";

interface CsvUploadProps {
  kontogruppen: Kontogruppe[];
  onFileSelected: (
    file: File,
    kontogruppeId: number | null,
    encoding: EncodingChoice,
    aiMode: AiImportMode
  ) => void;
}

export default function CsvUpload({ kontogruppen, onFileSelected }: CsvUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [selectedKontogruppe, setSelectedKontogruppe] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [encoding, setEncoding] = useState<EncodingChoice>("auto");
  const [aiMode, setAiMode] = useState<AiImportMode>("none");
  const { status: aiStatus } = useAiStatus();
  const effectiveMode: AiImportMode = aiStatus.enabled ? aiMode : "none";

  const submit = useCallback(
    (file: File, kontogruppeId: number | null) => {
      setFilename(file.name);
      onFileSelected(file, kontogruppeId, encoding, effectiveMode);
    },
    [onFileSelected, encoding, effectiveMode]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (kontogruppen.length === 0) {
        submit(file, null);
        return;
      }
      if (selectedKontogruppe !== null) {
        submit(file, selectedKontogruppe);
        return;
      }
      setPendingFile(file);
    },
    [kontogruppen, selectedKontogruppe, submit]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".csv")) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleConfirmPending = (kontogruppeId: number | null) => {
    if (pendingFile) {
      submit(pendingFile, kontogruppeId);
      setPendingFile(null);
    }
  };

  return (
    <div className="space-y-3">
      {kontogruppen.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Upload-Ziel:</span>
          <button
            onClick={() => setSelectedKontogruppe(null)}
            className={`rounded-lg border px-3 py-1 text-xs cursor-pointer ${
              selectedKontogruppe === null
                ? "border-slate-500 bg-slate-700 text-slate-200"
                : "border-slate-700 bg-slate-800/50 text-slate-500"
            }`}
          >
            (nachfragen)
          </button>
          {kontogruppen.map((kg) => (
            <button
              key={kg.id}
              onClick={() => setSelectedKontogruppe(kg.id)}
              className="rounded-lg border px-3 py-1 text-xs cursor-pointer"
              style={
                selectedKontogruppe === kg.id
                  ? {
                      borderColor: kg.color,
                      backgroundColor: kg.color + "22",
                      color: kg.color,
                    }
                  : {
                      borderColor: "rgb(51,65,85)",
                      backgroundColor: "rgba(30,41,59,0.5)",
                      color: "rgb(148,163,184)",
                    }
              }
            >
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: kg.color }}
              />
              {kg.name}
              {kg.bank && (
                <span className="ml-1.5 text-[10px] opacity-60">· {kg.bank}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-400">Encoding:</span>
        {ENCODINGS.map((enc) => (
          <button
            key={enc}
            onClick={() => setEncoding(enc)}
            className={`rounded-lg border px-3 py-1 text-xs cursor-pointer ${
              encoding === enc
                ? "border-slate-500 bg-slate-700 text-slate-200"
                : "border-slate-700 bg-slate-800/50 text-slate-500"
            }`}
            title={
              enc === "auto"
                ? "Encoding aus Bank-Preset (Sparkasse: windows-1252, sonst utf-8)"
                : enc
            }
          >
            {enc}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <Toggle
            checked={effectiveMode === "rulesThenAi"}
            onChange={(v) => setAiMode(v ? "rulesThenAi" : "none")}
            disabled={!aiStatus.enabled || effectiveMode === "allAi"}
            accent="purple"
            title={
              !aiStatus.enabled
                ? "Erst in den Einstellungen → KI-Kategorisierung Ollama aktivieren"
                : effectiveMode === "allAi"
                  ? "Deaktiviert, weil 'Alle Buchungen über KI' aktiv ist"
                  : "Regeln versuchen — Buchungen mit Kategorie 'Sonstiges' anschließend per KI klassifizieren"
            }
            label={
              <>
                Angelegte Kategorien versuchen zuzuordnen, danach KI
                {aiStatus.enabled && aiStatus.model ? (
                  <span className="ml-1 text-slate-500">({aiStatus.model})</span>
                ) : null}
              </>
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <Toggle
            checked={effectiveMode === "allAi"}
            onChange={(v) => setAiMode(v ? "allAi" : "none")}
            disabled={!aiStatus.enabled}
            accent="purple"
            title={
              aiStatus.enabled
                ? "Alle neu importierten Buchungen per KI klassifizieren (überschreibt Regel-Matches)"
                : "Erst in den Einstellungen → KI-Kategorisierung Ollama aktivieren"
            }
            label="Alle Buchungen über KI kategorisieren"
          />
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors duration-200 cursor-pointer ${
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800/80"
        }`}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <Upload className="mb-3 h-9 w-9 text-slate-400" />
        {filename ? (
          <p className="text-sm text-emerald-400">{filename} geladen</p>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-300">
              CSV-Datei hierher ziehen oder klicken
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Konto-Export im CSV-Format (.csv)
            </p>
          </>
        )}
      </div>

      {pendingFile && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">
                Zu welcher Kontogruppe gehört &bdquo;{pendingFile.name}&ldquo;?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {kontogruppen.map((kg) => (
                  <button
                    key={kg.id}
                    onClick={() => handleConfirmPending(kg.id)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer"
                    style={{
                      borderColor: kg.color,
                      backgroundColor: kg.color + "22",
                      color: kg.color,
                    }}
                  >
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: kg.color }}
                    />
                    {kg.name}
                  </button>
                ))}
                <button
                  onClick={() => handleConfirmPending(null)}
                  className="rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200"
                >
                  Ohne Zuordnung
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
