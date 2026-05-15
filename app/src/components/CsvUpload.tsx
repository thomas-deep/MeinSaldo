"use client";

import { Upload } from "lucide-react";
import { useCallback, useState } from "react";

export type EncodingChoice = "auto" | "utf-8" | "windows-1252";
const ENCODINGS: EncodingChoice[] = ["auto", "utf-8", "windows-1252"];

export type AiImportMode = "none" | "rulesThenAi" | "allAi";

interface CsvUploadProps {
  filename: string | null;
  encoding: EncodingChoice;
  onEncodingChange: (e: EncodingChoice) => void;
  onFileSelected: (file: File, encoding: EncodingChoice) => void;
}

export default function CsvUpload({
  filename,
  encoding,
  onEncodingChange,
  onFileSelected,
}: CsvUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".csv")) onFileSelected(file, encoding);
    },
    [onFileSelected, encoding]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file, encoding);
    },
    [onFileSelected, encoding]
  );

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

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface px-5 py-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-faint">
          Encoding
        </span>
        {ENCODINGS.map((enc) => (
          <button
            key={enc}
            onClick={() => onEncodingChange(enc)}
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
  );
}
