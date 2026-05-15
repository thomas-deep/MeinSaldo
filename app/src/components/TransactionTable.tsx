"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowLeftRight,
  Sparkles,
  Loader2,
  X,
  Trash2,
  Tag,
  Wallet,
} from "lucide-react";
import { Kontogruppe, Transaction, formatKontogruppe } from "../lib/types";
import {
  AiProgress,
  runAiOnIds,
  useAiStatus,
} from "../lib/use-ai-categorize";

interface TransactionTableProps {
  transactions: Transaction[];
  kontogruppen: Kontogruppe[];
  kategorien: string[];
  onCategoryChange: (id: string, kategorie: string) => void;
  onUmbuchungToggle: (id: string, isUmbuchung: boolean) => void;
  onBulkCategory?: (ids: string[], kategorie: string) => Promise<void> | void;
  onBulkKontogruppe?: (ids: string[], kontogruppeId: number | null) => Promise<void> | void;
  onBulkUmbuchung?: (ids: string[], isUmbuchung: boolean) => Promise<void> | void;
  onBulkDelete?: (ids: string[]) => Promise<void> | void;
  onAiBulkDone?: () => void;
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  } catch {
    return dateStr;
  }
}

type SortKey = "buchungstag" | "betrag" | "kategorie" | "nameZahlungsbeteiligter";

export default function TransactionTable({
  transactions,
  kontogruppen,
  kategorien,
  onCategoryChange,
  onUmbuchungToggle,
  onBulkCategory,
  onBulkKontogruppe,
  onBulkUmbuchung,
  onBulkDelete,
  onAiBulkDone,
}: TransactionTableProps) {
  const allCategories = kategorien;
  const kontogruppenById = useMemo(
    () => Object.fromEntries(kontogruppen.map((k) => [k.id, k])),
    [kontogruppen]
  );
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("buchungstag");
  const [sortDesc, setSortDesc] = useState(true);
  const [filterKategorie, setFilterKategorie] = useState("");
  const [filterType, setFilterType] = useState<"alle" | "einnahmen" | "ausgaben">("alle");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(100);
  const PAGE_SIZE_OPTIONS: { value: number; label: string }[] = [
    { value: 50, label: "50" },
    { value: 100, label: "100" },
    { value: 250, label: "250" },
    { value: 500, label: "500" },
    { value: 0, label: "Alle" },
  ];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [aiProgress, setAiProgress] = useState<AiProgress | null>(null);
  const { status: aiStatus } = useAiStatus();

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.nameZahlungsbeteiligter.toLowerCase().includes(q) ||
          t.verwendungszweck.toLowerCase().includes(q) ||
          t.kategorie.toLowerCase().includes(q) ||
          t.buchungstext.toLowerCase().includes(q)
      );
    }

    if (filterKategorie) {
      result = result.filter((t) => t.kategorie === filterKategorie);
    }

    if (filterType === "einnahmen") result = result.filter((t) => t.betrag > 0);
    if (filterType === "ausgaben") result = result.filter((t) => t.betrag < 0);

    const collator = new Intl.Collator("de-DE", { sensitivity: "base" });
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "betrag") cmp = a.betrag - b.betrag;
      else cmp = collator.compare(a[sortKey] || "", b[sortKey] || "");
      return sortDesc ? -cmp : cmp;
    });

    return result;
  }, [transactions, search, sortKey, sortDesc, filterKategorie, filterType]);

  const effectivePageSize = pageSize === 0 ? filtered.length : pageSize;
  const totalPages =
    pageSize === 0 ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * effectivePageSize;
  const pageEnd = Math.min(pageStart + effectivePageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const allOnPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const someOnPageSelected =
    !allOnPageSelected && pageRows.some((r) => selected.has(r.id));

  const togglePageSelection = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = pageRows.every((r) => next.has(r.id));
      if (allSelected) pageRows.forEach((r) => next.delete(r.id));
      else pageRows.forEach((r) => next.add(r.id));
      return next;
    });
  }, [pageRows]);

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const runAiOnSelection = useCallback(async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setAiProgress({ done: 0, total: ids.length, matched: 0 });
    try {
      await runAiOnIds(ids, {
        force: true,
        onProgress: (p) => setAiProgress(p),
      });
      clearSelection();
      onAiBulkDone?.();
    } catch (e) {
      console.error("Bulk AI failed:", e);
    } finally {
      setAiProgress(null);
    }
  }, [selected, clearSelection, onAiBulkDone]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const renderSortIcon = (column: SortKey) => {
    if (sortKey !== column) return null;
    return sortDesc ? (
      <ChevronDown className="inline h-3.5 w-3.5" />
    ) : (
      <ChevronUp className="inline h-3.5 w-3.5" />
    );
  };

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-strong bg-surface-active py-2 pl-10 pr-3 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-fg-subtle" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="rounded-lg border border-border-strong bg-surface-active px-3 py-2 text-xs text-fg"
          >
            <option value="alle">Alle</option>
            <option value="einnahmen">Einnahmen</option>
            <option value="ausgaben">Ausgaben</option>
          </select>

          <select
            value={filterKategorie}
            onChange={(e) => setFilterKategorie(e.target.value)}
            className="rounded-lg border border-border-strong bg-surface-active px-3 py-2 text-xs text-fg"
          >
            <option value="">Alle Kategorien</option>
            {allCategories.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-fg-subtle">
          {filtered.length} von {transactions.length}
        </span>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-fg/10 bg-bg-muted/60 px-5 py-3">
          <span className="text-sm font-medium text-fg">
            {selected.size} Buchung{selected.size === 1 ? "" : "en"} ausgewählt
          </span>
          <div className="flex-1" />
          {aiProgress ? (
            <span className="flex items-center gap-2 text-xs text-magic">
              <Loader2 className="h-4 w-4 animate-spin" />
              {aiProgress.done} / {aiProgress.total} – {aiProgress.matched} erkannt
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {/* Kategorie für alle setzen */}
              {onBulkCategory && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface pl-2.5 pr-1 py-0.5">
                  <Tag className="h-3.5 w-3.5 text-fg-muted" />
                  <select
                    value=""
                    onChange={async (e) => {
                      const v = e.target.value;
                      if (!v) return;
                      const ids = Array.from(selected);
                      await onBulkCategory(ids, v);
                      e.target.value = "";
                    }}
                    className="border-none bg-transparent py-1 text-xs text-fg outline-none cursor-pointer"
                  >
                    <option value="">Kategorie ändern…</option>
                    {allCategories.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Kontogruppe für alle setzen */}
              {onBulkKontogruppe && kontogruppen.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface pl-2.5 pr-1 py-0.5">
                  <Wallet className="h-3.5 w-3.5 text-fg-muted" />
                  <select
                    value=""
                    onChange={async (e) => {
                      const v = e.target.value;
                      if (v === "") return;
                      const ids = Array.from(selected);
                      const kgId = v === "null" ? null : Number(v);
                      await onBulkKontogruppe(ids, kgId);
                      e.target.value = "";
                    }}
                    className="border-none bg-transparent py-1 text-xs text-fg outline-none cursor-pointer"
                  >
                    <option value="">Konto wechseln…</option>
                    {kontogruppen.map((k) => (
                      <option key={k.id} value={k.id}>
                        {formatKontogruppe(k)}
                      </option>
                    ))}
                    <option value="null">(keine Zuordnung)</option>
                  </select>
                </div>
              )}

              {/* Umbuchungs-Toggle */}
              {onBulkUmbuchung && (
                <>
                  <button
                    onClick={async () => {
                      await onBulkUmbuchung(Array.from(selected), true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-fg-soft hover:border-border-strong hover:text-fg cursor-pointer"
                    title="Alle markierten als Umbuchung setzen"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    Umbuchung
                  </button>
                  <button
                    onClick={async () => {
                      await onBulkUmbuchung(Array.from(selected), false);
                    }}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-fg-soft hover:border-border-strong hover:text-fg cursor-pointer"
                    title="Umbuchungs-Markierung entfernen"
                  >
                    keine
                  </button>
                </>
              )}

              {/* AI */}
              <button
                onClick={runAiOnSelection}
                disabled={!aiStatus.enabled}
                title={
                  aiStatus.enabled
                    ? `Auswahl mit ${aiStatus.model} neu kategorisieren`
                    : "Erst in den Einstellungen → KI-Kategorisierung Ollama aktivieren"
                }
                className="flex items-center gap-1.5 rounded-lg bg-magic px-2.5 py-1.5 text-xs font-medium text-magic-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                KI
              </button>

              {/* Löschen */}
              {onBulkDelete && (
                <button
                  onClick={async () => {
                    const n = selected.size;
                    if (!confirm(`${n} Buchung${n === 1 ? "" : "en"} wirklich löschen?`)) return;
                    await onBulkDelete(Array.from(selected));
                    clearSelection();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger-soft px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/15 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Löschen
                </button>
              )}

              <button
                onClick={clearSelection}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-fg-soft hover:border-border-strong cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Abbrechen
              </button>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-fg-muted">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someOnPageSelected;
                  }}
                  onChange={togglePageSelection}
                  title={
                    allOnPageSelected
                      ? "Auswahl auf dieser Seite aufheben"
                      : "Alle Buchungen dieser Seite auswählen"
                  }
                  className="h-3.5 w-3.5 cursor-pointer accent-[var(--magic)]"
                />
              </th>
              <th
                className="cursor-pointer px-5 py-3 hover:text-fg"
                onClick={() => handleSort("buchungstag")}
              >
                Datum {renderSortIcon("buchungstag")}
              </th>
              <th
                className="cursor-pointer px-5 py-3 hover:text-fg"
                onClick={() => handleSort("nameZahlungsbeteiligter")}
              >
                Zahlungsbeteiligter {renderSortIcon("nameZahlungsbeteiligter")}
              </th>
              <th className="px-5 py-3">Verwendungszweck</th>
              <th className="px-5 py-3">Gruppe</th>
              <th
                className="cursor-pointer px-5 py-3 hover:text-fg"
                onClick={() => handleSort("kategorie")}
              >
                Kategorie {renderSortIcon("kategorie")}
              </th>
              <th
                className="cursor-pointer px-5 py-3 text-right hover:text-fg"
                onClick={() => handleSort("betrag")}
              >
                Betrag {renderSortIcon("betrag")}
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((tx) => {
              const isSelected = selected.has(tx.id);
              return (
                <tr
                  key={tx.id}
                  className={`border-b border-border transition-colors ${
                    isSelected
                      ? "bg-magic-soft hover:bg-magic-soft"
                      : "hover:bg-surface-hover"
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(tx.id)}
                      className="h-3.5 w-3.5 cursor-pointer accent-[var(--magic)]"
                    />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-fg-muted">
                    {formatDate(tx.buchungstag)}
                  </td>
                  <td className="max-w-[200px] truncate px-5 py-3 text-fg">
                    {tx.nameZahlungsbeteiligter}
                  </td>
                  <td className="max-w-[280px] truncate px-5 py-3 text-fg-muted">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUmbuchungToggle(tx.id, !tx.isUmbuchung);
                        }}
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer transition-colors ${
                          tx.isUmbuchung
                            ? "bg-warn-soft text-warn hover:bg-warn-soft"
                            : "border border-border text-fg-faint hover:border-warn hover:text-warn"
                        }`}
                        title={
                          tx.isUmbuchung
                            ? "Als Umbuchung markiert (klicken zum Aufheben)"
                            : "Als Umbuchung markieren"
                        }
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                        {tx.isUmbuchung ? "Umbuchung" : "Umbuchen?"}
                      </button>
                      <span className="truncate">{tx.verwendungszweck}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {tx.kontogruppeId && kontogruppenById[tx.kontogruppeId] ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor:
                            kontogruppenById[tx.kontogruppeId].color + "22",
                          color: kontogruppenById[tx.kontogruppeId].color,
                        }}
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: kontogruppenById[tx.kontogruppeId].color,
                          }}
                        />
                        {kontogruppenById[tx.kontogruppeId].name}
                      </span>
                    ) : (
                      <span className="text-xs text-fg-faint">–</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={tx.kategorie}
                      onChange={(e) => onCategoryChange(tx.id, e.target.value)}
                      className="rounded border border-border-strong bg-surface-active px-2 py-1 text-xs text-fg-soft"
                    >
                      {allCategories.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td
                    className={`whitespace-nowrap px-5 py-3 text-right font-medium ${
                      tx.betrag >= 0 ? "text-positive" : "text-danger"
                    }`}
                  >
                    {formatEuro(tx.betrag)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-fg-subtle">
        <span>
          {filtered.length === 0
            ? "Keine Buchungen"
            : `Zeige ${pageStart + 1}–${pageEnd} von ${filtered.length}`}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5">
            <span className="uppercase tracking-[0.16em] text-fg-faint text-[10px] font-medium">
              Pro Seite
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="rounded border border-border bg-surface px-2 py-1 text-xs text-fg cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {totalPages > 1 && (
            <>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="rounded border border-border px-2 py-1 text-fg-soft disabled:cursor-not-allowed disabled:opacity-40 hover:border-border-strong cursor-pointer"
              >
                Zurück
              </button>
              <span className="text-fg-muted">
                Seite {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="rounded border border-border px-2 py-1 text-fg-soft disabled:cursor-not-allowed disabled:opacity-40 hover:border-border-strong cursor-pointer"
              >
                Weiter
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
