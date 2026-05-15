"use client";

import { Wallet } from "lucide-react";
import { Kontogruppe, formatKontogruppe } from "../lib/types";

interface KontoPickerProps {
  kontogruppen: Kontogruppe[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

export default function KontoPicker({
  kontogruppen,
  selected,
  onSelect,
}: KontoPickerProps) {
  if (kontogruppen.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-5 py-3 text-xs text-fg-subtle">
        <Wallet className="mr-2 inline h-4 w-4" />
        Noch keine Kontogruppen angelegt — Import läuft ohne Zuordnung.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-4">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-fg-faint">
        Konto-Zuordnung
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {kontogruppen.map((kg) => {
          const active = selected === kg.id;
          return (
            <button
              key={kg.id}
              onClick={() => onSelect(kg.id)}
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
        <button
          onClick={() => onSelect(null)}
          className={`rounded-full border px-2.5 py-1 text-xs cursor-pointer transition-colors ${
            selected === null
              ? "border-border-strong bg-bg-muted text-fg"
              : "border-border bg-surface text-fg-subtle hover:text-fg"
          }`}
        >
          Ohne Zuordnung
        </button>
      </div>
    </div>
  );
}
