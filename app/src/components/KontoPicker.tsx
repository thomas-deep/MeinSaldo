"use client";

import { Sparkles, Wallet } from "lucide-react";
import { Kontogruppe, formatKontogruppe } from "../lib/types";
import { maskIban } from "../lib/iban";

interface KontoPickerProps {
  kontogruppen: Kontogruppe[];
  selected: number | null;
  onSelect: (id: number | null) => void;
  /** Optional: in der CSV erkannte IBAN Auftragskonto (normalisiert) — wenn sie
   *  einer Kontogruppe zugeordnet ist, zeigt der Picker einen Hinweis an. */
  detectedIban?: string | null;
  /** True, wenn die aktuelle `selected`-Vorauswahl durch das IBAN-Matching
   *  entstanden ist (nicht durch User-Klick). Steuert den Hinweis. */
  autoMatched?: boolean;
}

export default function KontoPicker({
  kontogruppen,
  selected,
  onSelect,
  detectedIban,
  autoMatched,
}: KontoPickerProps) {
  if (kontogruppen.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-5 py-3 text-xs text-fg-subtle">
        <Wallet className="mr-2 inline h-4 w-4" />
        Noch keine Kontogruppen angelegt — Import läuft ohne Zuordnung.
      </div>
    );
  }

  const matched =
    detectedIban != null
      ? kontogruppen.find((k) => k.iban === detectedIban)
      : null;
  const showHint = autoMatched && matched && selected === matched.id;

  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-4">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-fg-faint">
        Konto-Zuordnung
      </p>
      {showHint && matched && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-positive/40 bg-positive-soft px-2.5 py-1.5 text-[11px] text-positive">
          <Sparkles className="h-3.5 w-3.5" />
          <span>
            Automatisch erkannt anhand IBAN{" "}
            <span className="font-mono">{maskIban(detectedIban)}</span> — Konto{" "}
            <span className="font-medium">{formatKontogruppe(matched)}</span> vorausgewählt.
          </span>
        </div>
      )}
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
