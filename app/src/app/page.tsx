"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Database, Settings as SettingsIcon } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import CsvUpload, { AiImportMode, EncodingChoice } from "../components/CsvUpload";
import FieldMappingComponent from "../components/FieldMapping";
import SummaryCards from "../components/SummaryCards";
import CategoryChart from "../components/CategoryChart";
import MonthlyChart from "../components/MonthlyChart";
import TransactionTable from "../components/TransactionTable";
import CategoryDrillDown from "../components/CategoryDrillDown";
import DbStatus from "../components/DbStatus";
import KontogruppeFilter from "../components/KontogruppeFilter";
import SettingsView from "../components/SettingsView";
import AiCategorizeButton from "../components/AiCategorizeButton";
import {
  FieldMapping,
  Kontogruppe,
  PreprocessResult,
  RawRow,
  Transaction,
} from "../lib/types";
import { defaultMapping, bankPresets } from "../lib/field-mapping";
import { detectCsvHeaders } from "../lib/parse-csv";
import {
  AiProgress,
  runAiOnAllUncategorized,
  runAiOnIds,
} from "../lib/use-ai-categorize";
import AuswertungFilter, {
  AuswertungFilterState,
} from "../components/AuswertungFilter";
import { isWithin, rangeFor, shiftByYear } from "../lib/date-range";
import CsvImportPreview, {
  ImportPreview,
} from "../components/CsvImportPreview";

interface PresetHooks {
  preprocess?: (rawText: string) => PreprocessResult;
  rowTransform?: (row: RawRow) => RawRow;
}

interface DbStats {
  count: number;
  earliest: string | null;
  latest: string | null;
}

function presetEncoding(name: string | null): string {
  if (!name) return "utf-8";
  return bankPresets.find((p) => p.name === name)?.encoding ?? "utf-8";
}

async function decodeFile(file: File, encoding: string): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(buf);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  }
}

export default function Home() {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingEncoding, setPendingEncoding] = useState<EncodingChoice>("auto");
  const [pendingKontogruppeId, setPendingKontogruppeId] = useState<number | null>(null);
  const [presetName, setPresetName] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kontogruppen, setKontogruppen] = useState<Kontogruppe[]>([]);
  const [kategorienNames, setKategorienNames] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({ ...defaultMapping });
  const [separator, setSeparator] = useState(";");
  const [invertAmount, setInvertAmount] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState("EUR");
  const presetHooksRef = useRef<PresetHooks>({});
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "tabelle">("dashboard");
  const [view, setView] = useState<"auswertung" | "daten" | "einstellungen">("auswertung");
  const [dbStats, setDbStats] = useState<DbStats>({ count: 0, earliest: null, latest: null });
  const [lastImport, setLastImport] = useState<{ inserted: number; skipped: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState<AiProgress | null>(null);
  const [filter, setFilter] = useState<number | "all">("all");
  const [auswertungFilter, setAuswertungFilter] = useState<AuswertungFilterState>(() => ({
    preset: "alle",
    range: rangeFor("alle", new Date()),
    direction: "alle",
    minBetrag: 0,
    search: "",
    compareVorjahr: false,
  }));
  const [drillDown, setDrillDown] = useState<{
    kategorie: string;
    type: "einnahmen" | "ausgaben";
  } | null>(null);

  const loadFromDb = useCallback(async (signal?: AbortSignal) => {
    try {
      const [txRes, kgRes, katRes] = await Promise.all([
        fetch("/api/transactions", { signal }),
        fetch("/api/kontogruppen", { signal }),
        fetch("/api/kategorien", { signal }),
      ]);
      const txData = await txRes.json();
      const kgData = await kgRes.json();
      const katData = (await katRes.json()) as {
        kategorien: { name: string }[];
      };
      if (signal?.aborted) return;
      setTransactions(txData.transactions);
      setDbStats(txData.stats);
      setKontogruppen(kgData.kontogruppen);
      setKategorienNames(katData.kategorien.map((k) => k.name));
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      console.error("Load failed:", e);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount mit Abort-Cleanup
    loadFromDb(ctrl.signal);
    return () => ctrl.abort();
  }, [loadFromDb]);

  const applyPreset = useCallback((preset: (typeof bankPresets)[number]) => {
    setMapping({ ...preset.mapping });
    setSeparator(preset.separator);
    setInvertAmount(preset.invertAmount ?? false);
    setDefaultCurrency(preset.defaultCurrency ?? "EUR");
    setPresetName(preset.name);
    presetHooksRef.current = {
      preprocess: preset.preprocess,
      rowTransform: preset.rowTransform,
    };
  }, []);

  const buildFormData = (
    file: File,
    kontogruppeId: number | null,
    encoding: EncodingChoice,
    activeMapping: FieldMapping,
    activeSeparator: string,
    activeInvert: boolean,
    activeCurrency: string,
    activePresetName: string | null
  ): FormData => {
    const form = new FormData();
    form.append("file", file);
    form.append("encoding", encoding);
    if (kontogruppeId !== null) {
      form.append("kontogruppeId", String(kontogruppeId));
    }
    form.append("mapping", JSON.stringify(activeMapping));
    form.append("separator", activeSeparator);
    form.append("invertAmount", activeInvert ? "1" : "0");
    form.append("defaultCurrency", activeCurrency);
    if (activePresetName) form.append("preset", activePresetName);
    return form;
  };

  const fetchPreview = useCallback(
    async (
      file: File,
      kontogruppeId: number | null,
      encoding: EncodingChoice,
      activeMapping: FieldMapping,
      activeSeparator: string,
      activeInvert: boolean,
      activeCurrency: string,
      activePresetName: string | null
    ) => {
      setIsPreviewing(true);
      setImportError(null);
      try {
        const form = buildFormData(
          file,
          kontogruppeId,
          encoding,
          activeMapping,
          activeSeparator,
          activeInvert,
          activeCurrency,
          activePresetName
        );
        form.append("dryRun", "1");
        const res = await fetch("/api/import", { method: "POST", body: form });
        const result = await res.json();
        if (!res.ok) {
          setImportError(result.error ?? "Unbekannter Fehler beim Parsen");
          setImportPreview(null);
          return;
        }
        setImportPreview(result as ImportPreview);
      } catch (e) {
        setImportError(e instanceof Error ? e.message : "Parsen fehlgeschlagen");
        setImportPreview(null);
        console.error("Preview failed:", e);
      } finally {
        setIsPreviewing(false);
      }
    },
    []
  );

  const confirmImport = useCallback(
    async (
      file: File,
      kontogruppeId: number | null,
      encoding: EncodingChoice,
      activeMapping: FieldMapping,
      activeSeparator: string,
      activeInvert: boolean,
      activeCurrency: string,
      activePresetName: string | null,
      aiMode: AiImportMode
    ) => {
      setIsImporting(true);
      setImportError(null);
      try {
        const form = buildFormData(
          file,
          kontogruppeId,
          encoding,
          activeMapping,
          activeSeparator,
          activeInvert,
          activeCurrency,
          activePresetName
        );
        const res = await fetch("/api/import", { method: "POST", body: form });
        const result = (await res.json()) as {
          error?: string;
          inserted: number;
          skipped: number;
          insertedIds?: string[];
        };
        if (!res.ok) {
          setImportError(result.error ?? "Unbekannter Fehler beim Import");
          return;
        }
        setLastImport({ inserted: result.inserted, skipped: result.skipped });
        setImportPreview(null);
        await loadFromDb();

        const insertedIds = result.insertedIds ?? [];
        if (aiMode !== "none" && insertedIds.length > 0) {
          try {
            setAiProgress({ done: 0, total: 0, matched: 0 });
            if (aiMode === "allAi") {
              await runAiOnIds(insertedIds, {
                force: true,
                onProgress: (p) => setAiProgress(p),
              });
            } else {
              await runAiOnAllUncategorized((p) => setAiProgress(p));
            }
            await loadFromDb();
          } catch (e) {
            console.error("Auto-AI failed:", e);
          } finally {
            setAiProgress(null);
          }
        }
      } catch (e) {
        setImportError(e instanceof Error ? e.message : "Import fehlgeschlagen");
        console.error("Import failed:", e);
      } finally {
        setIsImporting(false);
      }
    },
    [loadFromDb]
  );

  const handleFileSelected = useCallback(
    async (
      file: File,
      kontogruppeId: number | null,
      encoding: EncodingChoice
    ) => {
      setPendingFile(file);
      setPendingEncoding(encoding);
      setPendingKontogruppeId(kontogruppeId);

      let activeMapping = mapping;
      let activeSeparator = separator;
      let activeInvert = invertAmount;
      let activeCurrency = defaultCurrency;
      let activePreset: string | null = presetName;

      if (kontogruppeId != null) {
        const kg = kontogruppen.find((k) => k.id === kontogruppeId);
        if (kg?.bank) {
          const preset = bankPresets.find((p) => p.name === kg.bank);
          if (preset) {
            applyPreset(preset);
            activeMapping = preset.mapping;
            activeSeparator = preset.separator;
            activeInvert = preset.invertAmount ?? false;
            activeCurrency = preset.defaultCurrency ?? "EUR";
            activePreset = preset.name;
          }
        }
      }

      const decodeEnc =
        encoding === "auto" ? presetEncoding(activePreset) : encoding;
      const text = await decodeFile(file, decodeEnc);
      const headers = detectCsvHeaders(text, activeSeparator, presetHooksRef.current);
      setCsvHeaders(headers);

      await fetchPreview(
        file,
        kontogruppeId,
        encoding,
        activeMapping,
        activeSeparator,
        activeInvert,
        activeCurrency,
        activePreset
      );
    },
    [
      mapping,
      separator,
      invertAmount,
      defaultCurrency,
      presetName,
      kontogruppen,
      applyPreset,
      fetchPreview,
    ]
  );

  const refreshHeaders = useCallback(
    async (sep: string) => {
      if (!pendingFile) return;
      const decodeEnc =
        pendingEncoding === "auto" ? presetEncoding(presetName) : pendingEncoding;
      const text = await decodeFile(pendingFile, decodeEnc);
      setCsvHeaders(detectCsvHeaders(text, sep, presetHooksRef.current));
    },
    [pendingFile, pendingEncoding, presetName]
  );

  const handleMappingChange = useCallback((newMapping: FieldMapping) => {
    setMapping(newMapping);
    setPresetName(null);
  }, []);

  const handleSeparatorChange = useCallback(
    (newSep: string) => {
      setSeparator(newSep);
      setPresetName(null);
      void refreshHeaders(newSep);
    },
    [refreshHeaders]
  );

  const handlePresetSelect = useCallback(
    (index: number) => {
      const preset = bankPresets[index];
      applyPreset(preset);
      void refreshHeaders(preset.separator);
    },
    [applyPreset, refreshHeaders]
  );

  const handleReparse = useCallback(() => {
    if (!pendingFile) return;
    void fetchPreview(
      pendingFile,
      pendingKontogruppeId,
      pendingEncoding,
      mapping,
      separator,
      invertAmount,
      defaultCurrency,
      presetName
    );
  }, [
    pendingFile,
    pendingKontogruppeId,
    pendingEncoding,
    mapping,
    separator,
    invertAmount,
    defaultCurrency,
    presetName,
    fetchPreview,
  ]);

  const handleConfirmImport = useCallback((aiMode: AiImportMode) => {
    if (!pendingFile) return;
    void confirmImport(
      pendingFile,
      pendingKontogruppeId,
      pendingEncoding,
      mapping,
      separator,
      invertAmount,
      defaultCurrency,
      presetName,
      aiMode
    );
  }, [
    pendingFile,
    pendingKontogruppeId,
    pendingEncoding,
    mapping,
    separator,
    invertAmount,
    defaultCurrency,
    presetName,
    confirmImport,
  ]);

  const handleCancelPreview = useCallback(() => {
    setImportPreview(null);
    setCsvHeaders([]);
    setPendingFile(null);
  }, []);

  const handleUmbuchungToggle = useCallback(
    async (id: string, isUmbuchung: boolean) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isUmbuchung } : t))
      );
      try {
        await fetch(`/api/transactions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ umbuchung: isUmbuchung }),
        });
      } catch (e) {
        console.error("Toggle failed:", e);
      }
    },
    []
  );

  const handleCategoryChange = useCallback(async (id: string, kategorie: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, kategorie } : t))
    );
    try {
      await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategorie }),
      });
    } catch (e) {
      console.error("Update failed:", e);
    }
  }, []);

  const handleClearDb = useCallback(async () => {
    if (!confirm("Alle gespeicherten Transaktionen löschen?")) return;
    try {
      await fetch("/api/transactions", { method: "DELETE" });
      setLastImport(null);
      await loadFromDb();
    } catch (e) {
      console.error("Clear failed:", e);
    }
  }, [loadFromDb]);

  const handleBulkCategory = useCallback(
    async (ids: string[], kategorie: string) => {
      await fetch("/api/transactions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, kategorie }),
      });
      await loadFromDb();
    },
    [loadFromDb]
  );

  const handleBulkUmbuchung = useCallback(
    async (ids: string[], isUmbuchung: boolean) => {
      await fetch("/api/transactions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, umbuchung: isUmbuchung }),
      });
      await loadFromDb();
    },
    [loadFromDb]
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      await fetch("/api/transactions/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      await loadFromDb();
    },
    [loadFromDb]
  );

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: transactions.length, null: 0 };
    for (const tx of transactions) {
      const key = tx.kontogruppeId == null ? "null" : String(tx.kontogruppeId);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [transactions]);

  const kontogruppenFiltered = useMemo(() => {
    if (filter === "all") return transactions;
    if (filter === -1) return transactions.filter((t) => t.kontogruppeId == null);
    return transactions.filter((t) => t.kontogruppeId === filter);
  }, [transactions, filter]);

  const applyAuswertungFilter = useCallback(
    (rows: Transaction[], range: typeof auswertungFilter.range) => {
      const q = auswertungFilter.search.trim().toLowerCase();
      const min = auswertungFilter.minBetrag;
      return rows.filter((t) => {
        if (!isWithin(t.buchungstag, range)) return false;
        if (auswertungFilter.direction === "einnahmen" && t.betrag <= 0) return false;
        if (auswertungFilter.direction === "ausgaben" && t.betrag >= 0) return false;
        if (min > 0 && Math.abs(t.betrag) < min) return false;
        if (q) {
          const hay = (
            t.nameZahlungsbeteiligter +
            " " +
            t.verwendungszweck +
            " " +
            t.kategorie +
            " " +
            t.buchungstext
          ).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    },
    [auswertungFilter]
  );

  const filteredTransactions = useMemo(
    () => applyAuswertungFilter(kontogruppenFiltered, auswertungFilter.range),
    [kontogruppenFiltered, auswertungFilter.range, applyAuswertungFilter]
  );

  const compareEnabled =
    auswertungFilter.compareVorjahr && auswertungFilter.preset !== "alle";
  const comparisonTransactions = useMemo(() => {
    if (!compareEnabled) return undefined;
    const prevRange = shiftByYear(auswertungFilter.range, 1);
    return applyAuswertungFilter(kontogruppenFiltered, prevRange);
  }, [
    compareEnabled,
    auswertungFilter.range,
    kontogruppenFiltered,
    applyAuswertungFilter,
  ]);

  const hasData = transactions.length > 0;

  const navItems = [
    { id: "auswertung" as const, label: "Auswertung", icon: LineChart },
    { id: "daten" as const, label: "Daten", icon: Database },
    { id: "einstellungen" as const, label: "Einstellungen", icon: SettingsIcon },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-baseline gap-3">
          <span
            aria-hidden
            className="inline-block h-4 w-1 translate-y-[3px] bg-fg"
          />
          <h1 className="font-display text-3xl font-medium tracking-tight text-fg">
            <span className="font-display-italic">Finanz</span>
            <span className="text-fg-muted">·</span>
            Auswertung
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5">
            {navItems.map((n) => {
              const Icon = n.icon;
              const active = view === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setView(n.id)}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium cursor-pointer transition-colors ${
                    active
                      ? "bg-fg text-fg-inverse"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {n.label}
                </button>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      {view === "einstellungen" && (
        <SettingsView
          kontogruppen={kontogruppen}
          onKontogruppenChange={loadFromDb}
        />
      )}

      {view === "daten" && (
        <div className="space-y-6">
          <CsvUpload kontogruppen={kontogruppen} onFileSelected={handleFileSelected} />

          {csvHeaders.length > 0 && (
            <FieldMappingComponent
              csvHeaders={csvHeaders}
              mapping={mapping}
              separator={separator}
              invertAmount={invertAmount}
              onMappingChange={handleMappingChange}
              onSeparatorChange={handleSeparatorChange}
              onInvertAmountChange={setInvertAmount}
              onPresetSelect={handlePresetSelect}
              onReparse={handleReparse}
              isReparseDisabled={isPreviewing || isImporting}
            />
          )}

          {isPreviewing && (
            <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-fg-soft">
              Datei wird geparst…
            </p>
          )}

          {importPreview && !isPreviewing && (
            <CsvImportPreview
              preview={importPreview}
              isImporting={isImporting}
              onConfirm={handleConfirmImport}
              onCancel={handleCancelPreview}
            />
          )}

          {aiProgress && (
            <p className="rounded-2xl border border-magic/30 bg-magic-soft px-4 py-3 text-sm text-magic">
              KI-Kategorisierung läuft… {aiProgress.done} / {aiProgress.total}
              {aiProgress.total > 0 && ` – ${aiProgress.matched} erkannt`}
            </p>
          )}

          {importError && (
            <p className="rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {importError}
            </p>
          )}

          {dbStats.count > 0 && (
            <DbStatus
              count={dbStats.count}
              earliest={dbStats.earliest}
              latest={dbStats.latest}
              lastImport={lastImport}
              onClear={handleClearDb}
            />
          )}

          {!isLoading && !hasData && !importPreview && (
            <p className="py-6 text-center text-sm text-fg-subtle">
              Noch keine Buchungen importiert. Lade eine CSV-Datei hoch, um zu starten.
            </p>
          )}
        </div>
      )}

      {view === "auswertung" && (
        <div className="space-y-6">
          {isLoading && (
            <p className="py-12 text-center text-sm text-fg-subtle">Lade...</p>
          )}

          {!isLoading && !hasData && (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <p className="text-sm text-fg-soft">
                Noch keine Daten zum Auswerten vorhanden.
              </p>
              <button
                onClick={() => setView("daten")}
                className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 cursor-pointer"
              >
                Zu Daten wechseln
              </button>
            </div>
          )}

          {!isLoading && hasData && (
            <>
              <AiCategorizeButton onDone={loadFromDb} />

              {kontogruppen.length > 0 && (
                <KontogruppeFilter
                  kontogruppen={kontogruppen}
                  selected={filter}
                  onSelect={setFilter}
                  counts={filterCounts}
                />
              )}

              <AuswertungFilter
                state={auswertungFilter}
                onChange={setAuswertungFilter}
              />

              <SummaryCards
                transactions={filteredTransactions}
                comparison={comparisonTransactions}
              />

              <div className="flex items-center gap-6 border-b border-border">
                <button
                  onClick={() => {
                    setActiveTab("dashboard");
                    setDrillDown(null);
                  }}
                  className={`-mb-px border-b-2 px-1 py-3 text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === "dashboard"
                      ? "border-fg text-fg"
                      : "border-transparent text-fg-muted hover:text-fg"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("tabelle")}
                  className={`-mb-px border-b-2 px-1 py-3 text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === "tabelle"
                      ? "border-fg text-fg"
                      : "border-transparent text-fg-muted hover:text-fg"
                  }`}
                >
                  Transaktionen{" "}
                  <span className="ml-1 inline-flex items-center rounded-full bg-bg-muted px-1.5 text-[10px] font-mono tabular-nums text-fg-muted">
                    {filteredTransactions.length}
                  </span>
                </button>
              </div>

              {activeTab === "dashboard" ? (
                drillDown ? (
                  <CategoryDrillDown
                    transactions={filteredTransactions}
                    kategorie={drillDown.kategorie}
                    type={drillDown.type}
                    kontogruppen={kontogruppen}
                    onBack={() => setDrillDown(null)}
                  />
                ) : (
                  <div className="space-y-6">
                    <MonthlyChart
                      transactions={filteredTransactions}
                      onMonthClick={(yearMonth) => {
                        const [yStr, mStr] = yearMonth.split("-");
                        const y = parseInt(yStr, 10);
                        const m = parseInt(mStr, 10);
                        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
                        const pad = (n: number) =>
                          n < 10 ? `0${n}` : String(n);
                        setAuswertungFilter({
                          ...auswertungFilter,
                          preset: "custom",
                          range: {
                            from: `${y}-${pad(m)}-01`,
                            to: `${y}-${pad(m)}-${pad(lastDay)}`,
                          },
                        });
                      }}
                    />
                    <div className="grid gap-6 lg:grid-cols-2">
                      <CategoryChart
                        transactions={filteredTransactions}
                        type="ausgaben"
                        onCategoryClick={(kategorie) =>
                          setDrillDown({ kategorie, type: "ausgaben" })
                        }
                      />
                      <CategoryChart
                        transactions={filteredTransactions}
                        type="einnahmen"
                        onCategoryClick={(kategorie) =>
                          setDrillDown({ kategorie, type: "einnahmen" })
                        }
                      />
                    </div>
                  </div>
                )
              ) : (
                <TransactionTable
                  transactions={filteredTransactions}
                  kontogruppen={kontogruppen}
                  kategorien={kategorienNames}
                  onCategoryChange={handleCategoryChange}
                  onUmbuchungToggle={handleUmbuchungToggle}
                  onBulkCategory={handleBulkCategory}
                  onBulkUmbuchung={handleBulkUmbuchung}
                  onBulkDelete={handleBulkDelete}
                  onAiBulkDone={() => loadFromDb()}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
