"use client";

import { Kontogruppe } from "../lib/types";

type FilterValue = number | "all";

interface KontogruppeFilterProps {
  kontogruppen: Kontogruppe[];
  selected: FilterValue;
  onSelect: (id: FilterValue) => void;
  counts: Record<string, number>;
}

export default function KontogruppeFilter({
  kontogruppen,
  selected,
  onSelect,
  counts,
}: KontogruppeFilterProps) {
  if (kontogruppen.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect("all")}
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
          selected === "all"
            ? "border-brand bg-brand-soft text-brand"
            : "border-border bg-surface text-fg-muted hover:border-border-strong"
        }`}
      >
        Gesamt
        <span className="text-fg-subtle">({counts["all"] ?? 0})</span>
      </button>
      {kontogruppen.map((kg) => (
        <button
          key={kg.id}
          onClick={() => onSelect(kg.id)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
            selected === kg.id
              ? "bg-fg text-fg-inverse"
              : "border-border bg-surface text-fg-muted hover:border-border-strong"
          }`}
          style={
            selected === kg.id
              ? { borderColor: kg.color, backgroundColor: kg.color + "22", color: kg.color }
              : undefined
          }
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: kg.color }}
          />
          {kg.name}
          <span className="text-fg-subtle">({counts[kg.id] ?? 0})</span>
        </button>
      ))}
      {counts["null"] > 0 && (
        <button
          onClick={() => onSelect(-1)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
            selected === -1
              ? "border-border-strong bg-surface-active text-fg"
              : "border-border bg-surface text-fg-muted hover:border-border-strong"
          }`}
        >
          Nicht zugeordnet
          <span className="text-fg-subtle">({counts["null"]})</span>
        </button>
      )}
    </div>
  );
}
