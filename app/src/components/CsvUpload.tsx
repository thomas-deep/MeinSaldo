"use client";

import { Upload, AlertCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { Kontogruppe, formatKontogruppe } from "../lib/types";

export type EncodingChoice = "auto" | "utf-8" | "windows-1252";
const ENCODINGS: EncodingChoice[] = ["auto", "utf-8", "windows-1252"];

export type AiImportMode = "none" | "rulesThenAi" | "allAi";

interface CsvUploadProps {
  kontogruppen: Kontogruppe[];
  onFileSelected: (
    file: File,
    kontogruppeId: number | null,
    encoding: EncodingChoice
  ) => void;
}

export default function CsvUpload({ kontogruppen, onFileSelected }: CsvUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [selectedKontogruppe, setSelectedKontogruppe] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [encoding, setEncoding] = useState<EncodingChoice>("auto");

  const submit = useCallback(
    (file: File, kontogruppeId: number | null) => {
      setFilename(file.name);
      onFileSelected(file, kontogruppeId, encoding);
    },
    [onFileSelected, encoding]
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
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-200 cursor-pointer ${
          isDragging
            ? "border-brand bg-brand-soft"
            : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover"
        }`}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <div className="rounded-full border border-border bg-bg-muted p-3">
          <Upload className="h-6 w-6 text-fg-muted" />
        </div>
        {filename ? (
          <>
            <p className="mt-4 font-editorial text-2xl text-fg">{filename}</p>
            <p className="mt-1 text-xs text-fg-subtle">geladen — andere Datei wählen</p>
          </>
        ) : (
          <>
            <p className="mt-4 font-editorial text-2xl text-fg">
              CSV-Datei hier ablegen
            </p>
            <p className="mt-1 text-xs text-fg-subtle">
              oder klicken zum Auswählen — Konto-Export (.csv)
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border bg-surface px-5 py-4">
        {kontogruppen.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-faint">
              Konto
            </span>
            <button
              onClick={() => setSelectedKontogruppe(null)}
              className={`rounded-full border px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                selectedKontogruppe === null
                  ? "border-border-strong bg-bg-muted text-fg"
                  : "border-border bg-surface text-fg-subtle hover:text-fg"
              }`}
            >
              (nachfragen)
            </button>
            {kontogruppen.map((kg) => {
              const active = selectedKontogruppe === kg.id;
              return (
                <button
                  key={kg.id}
                  onClick={() => setSelectedKontogruppe(kg.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                    active
                      ? "border-border-strong bg-bg-muted text-fg"
                      : "border-border bg-surface text-fg-muted hover:text-fg"
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: kg.color }}
                  />
                  {formatKontogruppe(kg)}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-faint">
            Encoding
          </span>
          {ENCODINGS.map((enc) => (
            <button
              key={enc}
              onClick={() => setEncoding(enc)}
              className={`rounded-full border px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                encoding === enc
                  ? "border-border-strong bg-bg-muted text-fg"
                  : "border-border bg-surface text-fg-subtle hover:text-fg"
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
      </div>

      {pendingFile && (
        <div className="rounded-2xl border border-warn bg-warn-soft p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warn" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warn">
                Zu welcher Kontogruppe gehört &bdquo;{pendingFile.name}&ldquo;?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {kontogruppen.map((kg) => (
                  <button
                    key={kg.id}
                    onClick={() => handleConfirmPending(kg.id)}
                    className="rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer"
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
                    {formatKontogruppe(kg)}
                  </button>
                ))}
                <button
                  onClick={() => handleConfirmPending(null)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted cursor-pointer hover:text-fg"
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
