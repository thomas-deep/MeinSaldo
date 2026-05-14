"use client";

import { Settings2 } from "lucide-react";
import { useState } from "react";
import { bankPresets, fieldLabels } from "../lib/field-mapping";
import { FieldMapping as FieldMappingType } from "../lib/types";

interface FieldMappingProps {
  csvHeaders: string[];
  mapping: FieldMappingType;
  separator: string;
  invertAmount: boolean;
  onMappingChange: (mapping: FieldMappingType) => void;
  onSeparatorChange: (sep: string) => void;
  onInvertAmountChange: (invert: boolean) => void;
  onPresetSelect: (presetIndex: number) => void;
}

export default function FieldMappingComponent({
  csvHeaders,
  mapping,
  separator,
  invertAmount,
  onMappingChange,
  onSeparatorChange,
  onInvertAmountChange,
  onPresetSelect,
}: FieldMappingProps) {
  const [isOpen, setIsOpen] = useState(false);

  const mappingKeys = Object.keys(fieldLabels) as (keyof FieldMappingType)[];

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-fg-muted" />
          <span className="text-sm font-medium text-fg">
            Feld-Mapping & Bank-Vorlagen
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-fg-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-border px-5 py-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {bankPresets.map((preset, i) => (
              <button
                key={preset.name}
                onClick={() => onPresetSelect(i)}
                className="rounded-lg border border-border-strong bg-bg-muted px-3 py-1.5 text-xs font-medium text-fg-soft transition-colors hover:border-brand hover:text-brand cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Trennzeichen</label>
              <select
                value={separator}
                onChange={(e) => onSeparatorChange(e.target.value)}
                className="rounded-lg border border-border-strong bg-surface-active px-3 py-1.5 text-sm text-fg"
              >
                <option value=";">Semikolon (;)</option>
                <option value=",">Komma (,)</option>
                <option value="\t">Tab</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-fg-soft">
              <input
                type="checkbox"
                checked={invertAmount}
                onChange={(e) => onInvertAmountChange(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[var(--brand)]"
              />
              Vorzeichen umkehren
              <span className="text-fg-subtle">
                (für CSVs mit Ausgaben als positive Werte, z.B. AmEx)
              </span>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {mappingKeys.map((key) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-fg-muted">
                  {fieldLabels[key]}
                </label>
                <select
                  value={mapping[key]}
                  onChange={(e) =>
                    onMappingChange({ ...mapping, [key]: e.target.value })
                  }
                  className="w-full rounded-lg border border-border-strong bg-surface-active px-3 py-1.5 text-sm text-fg"
                >
                  <option value="">-- nicht zugeordnet --</option>
                  {csvHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
