"use client";

import { useMemo } from "react";
import { Inhaber, Kontogruppe } from "../lib/types";

export type KontogruppeFilterValue =
  | { kind: "all" }
  | { kind: "inhaber"; id: number }
  | { kind: "kontogruppe"; id: number }
  | { kind: "none" };

interface KontogruppeFilterProps {
  kontogruppen: Kontogruppe[];
  inhaber: Inhaber[];
  selected: KontogruppeFilterValue;
  onSelect: (v: KontogruppeFilterValue) => void;
  /** Anzahl pro kontogruppe.id (number) und "null" für nicht zugeordnete */
  counts: {
    total: number;
    perKontogruppe: Record<number, number>;
    none: number;
  };
}

function isActive(
  selected: KontogruppeFilterValue,
  candidate: KontogruppeFilterValue
): boolean {
  if (selected.kind !== candidate.kind) return false;
  if (selected.kind === "inhaber" && candidate.kind === "inhaber")
    return selected.id === candidate.id;
  if (selected.kind === "kontogruppe" && candidate.kind === "kontogruppe")
    return selected.id === candidate.id;
  return true;
}

export default function KontogruppeFilter({
  kontogruppen,
  inhaber,
  selected,
  onSelect,
  counts,
}: KontogruppeFilterProps) {
  const grouped = useMemo(() => {
    const map = new Map<number, Kontogruppe[]>();
    for (const kg of kontogruppen) {
      const list = map.get(kg.inhaberId) ?? [];
      list.push(kg);
      map.set(kg.inhaberId, list);
    }
    return inhaber
      .map((i) => ({
        inhaber: i,
        kontogruppen: map.get(i.id) ?? [],
        sum: (map.get(i.id) ?? []).reduce(
          (s, kg) => s + (counts.perKontogruppe[kg.id] ?? 0),
          0
        ),
      }))
      .filter((g) => g.kontogruppen.length > 0);
  }, [inhaber, kontogruppen, counts.perKontogruppe]);

  if (kontogruppen.length === 0) return null;

  const isAll = selected.kind === "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onSelect({ kind: "all" })}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
          isAll
            ? "border-fg bg-fg text-fg-inverse"
            : "border-border bg-surface text-fg-muted hover:text-fg"
        }`}
      >
        Gesamt
        <span className={isAll ? "opacity-70" : "text-fg-subtle"}>
          ({counts.total})
        </span>
      </button>

      {grouped.map(({ inhaber: i, kontogruppen: kgs, sum }) => {
        const inhaberActive = isActive(selected, { kind: "inhaber", id: i.id });
        return (
          <div
            key={i.id}
            className="flex items-center gap-1 rounded-full border border-border bg-surface p-0.5"
          >
            <button
              onClick={() => onSelect({ kind: "inhaber", id: i.id })}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                inhaberActive
                  ? "bg-fg text-fg-inverse"
                  : "text-fg hover:bg-bg-muted"
              }`}
              title={`Alle Konten von ${i.name}`}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: i.color }}
              />
              {i.name}
              <span className={inhaberActive ? "opacity-70" : "text-fg-subtle"}>
                ({sum})
              </span>
            </button>
            {kgs.map((kg) => {
              const active = isActive(selected, {
                kind: "kontogruppe",
                id: kg.id,
              });
              return (
                <button
                  key={kg.id}
                  onClick={() => onSelect({ kind: "kontogruppe", id: kg.id })}
                  className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium cursor-pointer transition-colors"
                  style={
                    active
                      ? {
                          backgroundColor: kg.color + "22",
                          color: kg.color,
                          borderColor: kg.color,
                        }
                      : undefined
                  }
                  title={`${i.name} · ${kg.name}`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${active ? "" : "opacity-60"}`}
                    style={{ backgroundColor: kg.color }}
                  />
                  <span className={active ? "" : "text-fg-muted"}>
                    {kg.name}
                  </span>
                  <span
                    className={active ? "opacity-70" : "text-fg-subtle"}
                  >
                    ({counts.perKontogruppe[kg.id] ?? 0})
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}

      {counts.none > 0 && (
        <button
          onClick={() => onSelect({ kind: "none" })}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
            selected.kind === "none"
              ? "border-fg bg-fg text-fg-inverse"
              : "border-border bg-surface text-fg-muted hover:text-fg"
          }`}
        >
          Nicht zugeordnet
          <span
            className={
              selected.kind === "none" ? "opacity-70" : "text-fg-subtle"
            }
          >
            ({counts.none})
          </span>
        </button>
      )}
    </div>
  );
}
