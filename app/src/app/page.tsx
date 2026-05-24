"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Database, Settings as SettingsIcon, Search, Repeat, Wallet } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import SearchPalette from "../components/SearchPalette";
import RecurringView from "../components/RecurringView";
import NetWorthView from "../components/NetWorthView";
import CsvUpload, { AiImportMode, EncodingChoice } from "../components/CsvUpload";
import KontoPicker from "../components/KontoPicker";
import FieldMappingComponent from "../components/FieldMapping";
import SummaryCards from "../components/SummaryCards";
import CategoryChart from "../components/CategoryChart";
import MonthlyChart from "../components/MonthlyChart";
import TransactionTable from "../components/TransactionTable";
import CategoryDrillDown from "../components/CategoryDrillDown";
import DbStatus from "../components/DbStatus";
import KontogruppeFilter from "../components/KontogruppeFilter";
import FilterPresetMenu from "../components/FilterPresetMenu";
import SettingsView from "../components/SettingsView";
import {
  FieldMapping,
  FilterPreset,
  Inhaber,
  Kontogruppe,
  PreprocessResult,
  RawRow,
  Transaction,
} from "../lib/types";
import { defaultMapping, bankPresets } from "../lib/field-mapping";
import { detectCsvHeaders, detectIbanFromCsv } from "../lib/parse-csv";
import {
  AiProgress,
  runAiOnAllUncategorized,
  runAiOnUncategorizedAmong,
  runAiOnIds,
} from "../lib/use-ai-categorize";
import AuswertungFilter, {
  AuswertungFilterState,
} from "../components/AuswertungFilter";
import { isWithin, rangeFor, shiftByYear } from "../lib/date-range";
import CsvImportPreview, {
  ImportPreview,
} from "../components/CsvImportPreview";
import ImportHistory from "../components/ImportHistory";
import {
  KontogruppeFilterValue,
  EMPTY_FILTER,
  isFilterEmpty,
} from "../components/KontogruppeFilter";

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
  const [kontoChosen, setKontoChosen] = useState(false);
  const [presetName, setPresetName] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kontogruppen, setKontogruppen] = useState<Kontogruppe[]>([]);
  const [kategorienNames, setKategorienNames] = useState<string[]>([]);
  const [inhaber, setInhaber] = useState<Inhaber[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({ ...defaultMapping });
  const [separator, setSeparator] = useState(";");
  const [invertAmount, setInvertAmount] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState("EUR");
  const presetHooksRef = useRef<PresetHooks>({});
  const handleKontoSelectedRef = useRef<(id: number | null) => Promise<void>>(
    async () => {}
  );
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [detectedIban, setDetectedIban] = useState<string | null>(null);
  const [autoMatched, setAutoMatched] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "tabelle">("dashboard");
  const [view, setView] = useState<"auswertung" | "wiederkehrend" | "vermoegen" | "daten" | "einstellungen">("auswertung");
  const [dbStats, setDbStats] = useState<DbStats>({ count: 0, earliest: null, latest: null });
  const [lastImport, setLastImport] = useState<{ inserted: number; skipped: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState<AiProgress | null>(null);
  const [filter, setFilter] = useState<KontogruppeFilterValue>(EMPTY_FILTER);
  const [searchOpen, setSearchOpen] = useState(false);
  const [auswertungFilter, setAuswertungFilter] = useState<AuswertungFilterState>(() => ({
    preset: "alle",
    range: rangeFor("alle", new Date()),
    direction: "alle",
    minBetrag: 0,
    search: "",
    compareVorjahr: false,
    includeUmbuchungen: false,
  }));
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [drillDown, setDrillDown] = useState<{
    kategorie: string;
    type: "einnahmen" | "ausgaben";
  } | null>(null);

  const loadFromDb = useCallback(async (signal?: AbortSignal) => {
    try {
      const [txRes, kgRes, katRes, inhRes, presetsRes] = await Promise.all([
        fetch("/api/transactions", { signal }),
        fetch("/api/kontogruppen", { signal }),
        fetch("/api/kategorien", { signal }),
        fetch("/api/inhaber", { signal }),
        fetch("/api/filter-presets", { signal }),
      ]);
      const txData = await txRes.json();
      const kgData = await kgRes.json();
      const katData = (await katRes.json()) as {
        kategorien: { name: string }[];
      };
      const inhData = (await inhRes.json()) as { inhaber: Inhaber[] };
      const presetsData = (await presetsRes.json()) as { presets: FilterPreset[] };
      if (signal?.aborted) return;
      setTransactions(txData.transactions);
      setDbStats(txData.stats);
      setKontogruppen(kgData.kontogruppen);
      setKategorienNames(katData.kategorien.map((k) => k.name));
      setInhaber(inhData.inhaber);
      setFilterPresets(presetsData.presets);
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
              // rulesThenAi: nur die neu importierten Buchungen, die als
              // „Sonstiges" übrig blieben — nicht die gesamte DB.
              await runAiOnUncategorizedAmong(insertedIds, (p) =>
                setAiProgress(p)
              );
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
    async (file: File, encoding: EncodingChoice) => {
      setPendingFile(file);
      setPendingEncoding(encoding);
      setImportError(null);
      setImportPreview(null);
      const decodeEnc =
        encoding === "auto" ? presetEncoding(presetName) : encoding;
      const text = await decodeFile(file, decodeEnc);
      const headers = detectCsvHeaders(text, separator, presetHooksRef.current);
      setCsvHeaders(headers);

      // IBAN-basierte Auto-Konto-Vorauswahl: nur greifen, wenn der User
      // noch kein Konto manuell gewählt hat.
      const iban = detectIbanFromCsv(text, mapping, separator, presetHooksRef.current);
      setDetectedIban(iban);
      const match = iban
        ? kontogruppen.find((k) => k.iban === iban)
        : undefined;

      if (kontoChosen) {
        await fetchPreview(
          file,
          pendingKontogruppeId,
          encoding,
          mapping,
          separator,
          invertAmount,
          defaultCurrency,
          presetName
        );
      } else if (match) {
        setAutoMatched(true);
        await handleKontoSelectedRef.current(match.id);
      }
    },
    [
      presetName,
      separator,
      kontoChosen,
      pendingKontogruppeId,
      mapping,
      invertAmount,
      defaultCurrency,
      fetchPreview,
      kontogruppen,
    ]
  );

  const handleKontoSelected = useCallback(
    async (kontogruppeId: number | null) => {
      setPendingKontogruppeId(kontogruppeId);
      setKontoChosen(true);
      if (!pendingFile) return;

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
        pendingEncoding === "auto"
          ? presetEncoding(activePreset)
          : pendingEncoding;
      const text = await decodeFile(pendingFile, decodeEnc);
      const headers = detectCsvHeaders(
        text,
        activeSeparator,
        presetHooksRef.current
      );
      setCsvHeaders(headers);

      await fetchPreview(
        pendingFile,
        kontogruppeId,
        pendingEncoding,
        activeMapping,
        activeSeparator,
        activeInvert,
        activeCurrency,
        activePreset
      );
    },
    [
      pendingFile,
      pendingEncoding,
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

  // Ref hält die aktuellste handleKontoSelected-Closure, damit der
  // Auto-Match-Pfad in handleFileSelected (oben definiert) sie nutzen kann
  // ohne in dessen Callback-Deps zu hängen.
  useEffect(() => {
    handleKontoSelectedRef.current = handleKontoSelected;
  }, [handleKontoSelected]);

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
    setPendingKontogruppeId(null);
    setKontoChosen(false);
    setDetectedIban(null);
    setAutoMatched(false);
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
      await fetch("/api/transactions-bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, kategorie }),
      });
      await loadFromDb();
    },
    [loadFromDb]
  );

  const handleBulkKontogruppe = useCallback(
    async (ids: string[], kontogruppeId: number | null) => {
      await fetch("/api/transactions-bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, kontogruppeId }),
      });
      await loadFromDb();
    },
    [loadFromDb]
  );

  const handleBulkUmbuchung = useCallback(
    async (ids: string[], isUmbuchung: boolean) => {
      await fetch("/api/transactions-bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, umbuchung: isUmbuchung }),
      });
      await loadFromDb();
    },
    [loadFromDb]
  );

  const handleRecomputeUmbuchungen = useCallback(async () => {
    await fetch("/api/umbuchungen/recompute", { method: "POST" });
    await loadFromDb();
  }, [loadFromDb]);

  const handleRecategorizeRules = useCallback(
    async (mode: "rules" | "rules-only-sonstiges") => {
      await fetch("/api/categorize-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      await loadFromDb();
    },
    [loadFromDb]
  );

  const handleRecategorizeAi = useCallback(
    async (mode: "ai-sonstiges" | "ai-all") => {
      try {
        if (mode === "ai-sonstiges") {
          setAiProgress({ done: 0, total: 0, matched: 0 });
          await runAiOnAllUncategorized((p) => setAiProgress(p));
        } else {
          const res = await fetch("/api/categorize-all?scope=all");
          const json = (await res.json()) as { ids: string[] };
          const ids = json.ids;
          if (ids.length === 0) return;
          setAiProgress({ done: 0, total: ids.length, matched: 0 });
          await runAiOnIds(ids, {
            force: true,
            onProgress: (p) => setAiProgress(p),
          });
        }
        await loadFromDb();
      } finally {
        setAiProgress(null);
      }
    },
    [loadFromDb]
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      await fetch("/api/transactions-bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      await loadFromDb();
    },
    [loadFromDb]
  );

  const filterCounts = useMemo(() => {
    const perKontogruppe: Record<number, number> = {};
    let none = 0;
    for (const tx of transactions) {
      if (tx.kontogruppeId == null) none++;
      else perKontogruppe[tx.kontogruppeId] = (perKontogruppe[tx.kontogruppeId] ?? 0) + 1;
    }
    return { total: transactions.length, perKontogruppe, none };
  }, [transactions]);

  const kontogruppenByInhaber = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const kg of kontogruppen) {
      const set = map.get(kg.inhaberId) ?? new Set<number>();
      set.add(kg.id);
      map.set(kg.inhaberId, set);
    }
    return map;
  }, [kontogruppen]);

  const kontogruppenFiltered = useMemo(() => {
    if (isFilterEmpty(filter)) return transactions;
    const allowedKgIds = new Set<number>(filter.kontogruppeIds);
    for (const inhaberId of filter.inhaberIds) {
      const kgIds = kontogruppenByInhaber.get(inhaberId);
      if (kgIds) for (const id of kgIds) allowedKgIds.add(id);
    }
    return transactions.filter((t) => {
      if (t.kontogruppeId == null) return filter.includeNone;
      return allowedKgIds.has(t.kontogruppeId);
    });
  }, [transactions, filter, kontogruppenByInhaber]);

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

  // Serialisierte Repräsentation der aktuellen Filter-Kombi — wird mit
  // FilterPreset.payload verglichen (string-Vergleich), um den aktiven Preset
  // und die Save-Button-Sichtbarkeit zu derivieren.
  const currentPresetPayload = useMemo(
    () => JSON.stringify({ auswertung: auswertungFilter, kontogruppen: filter }),
    [auswertungFilter, filter]
  );

  const hasActiveFilters =
    !isFilterEmpty(filter) ||
    auswertungFilter.preset !== "alle" ||
    auswertungFilter.direction !== "alle" ||
    auswertungFilter.minBetrag > 0 ||
    auswertungFilter.search.trim().length > 0 ||
    auswertungFilter.compareVorjahr ||
    auswertungFilter.includeUmbuchungen;

  const reloadFilterPresets = useCallback(async () => {
    const r = await fetch("/api/filter-presets");
    const j = (await r.json()) as { presets: FilterPreset[] };
    setFilterPresets(j.presets);
  }, []);

  const handleApplyPreset = useCallback((preset: FilterPreset) => {
    try {
      const parsed = JSON.parse(preset.payload) as {
        auswertung?: AuswertungFilterState;
        kontogruppen?: KontogruppeFilterValue;
      };
      if (parsed.auswertung) setAuswertungFilter(parsed.auswertung);
      if (parsed.kontogruppen) setFilter(parsed.kontogruppen);
    } catch (e) {
      console.error("Preset-Payload ungültig:", e);
    }
  }, []);

  const handleSavePreset = useCallback(
    async (name: string): Promise<{ error?: string } | void> => {
      const res = await fetch("/api/filter-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, payload: currentPresetPayload }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return { error: j.error ?? "Speichern fehlgeschlagen." };
      }
      await reloadFilterPresets();
    },
    [currentPresetPayload, reloadFilterPresets]
  );

  const handleDeletePreset = useCallback(
    async (preset: FilterPreset) => {
      if (!confirm(`Preset „${preset.name}" löschen?`)) return;
      await fetch(`/api/filter-presets/${preset.id}`, { method: "DELETE" });
      await reloadFilterPresets();
    },
    [reloadFilterPresets]
  );

  const navItems = [
    { id: "auswertung" as const, label: "Auswertung", icon: LineChart },
    { id: "wiederkehrend" as const, label: "Wiederkehrend", icon: Repeat },
    { id: "vermoegen" as const, label: "Vermögen", icon: Wallet },
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
          <h1 className="font-editorial text-3xl font-medium tracking-tight text-fg">
            <span className="font-editorial-italic">Mein</span>
            Saldo
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
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Suche öffnen (Cmd+K)"
            title="Suche (⌘K)"
            className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-fg-muted hover:text-fg"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Suchen</span>
            <kbd className="hidden md:inline rounded border border-border bg-bg px-1 text-[10px]">
              ⌘K
            </kbd>
          </button>
          <ThemeToggle />
        </div>
      </header>

      <SearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(t) => {
          setView("auswertung");
          setAuswertungFilter((prev) => ({
            ...prev,
            search: t.nameZahlungsbeteiligter || t.verwendungszweck,
          }));
        }}
      />

      {view === "einstellungen" && (
        <SettingsView
          kontogruppen={kontogruppen}
          inhaber={inhaber}
          onKontogruppenChange={loadFromDb}
        />
      )}

      {view === "wiederkehrend" && <RecurringView />}

      {view === "vermoegen" && <NetWorthView />}

      {view === "daten" && (
        <div className="space-y-6">
          <CsvUpload
            filename={pendingFile?.name ?? null}
            encoding={pendingEncoding}
            onEncodingChange={setPendingEncoding}
            onFileSelected={handleFileSelected}
          />

          {pendingFile && (
            <KontoPicker
              kontogruppen={kontogruppen}
              selected={kontoChosen ? pendingKontogruppeId : null}
              detectedIban={detectedIban}
              autoMatched={autoMatched}
              onSelect={(id) => {
                setAutoMatched(false);
                void handleKontoSelected(id);
              }}
            />
          )}

          {pendingFile && kontoChosen && csvHeaders.length > 0 && (
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
              onRecomputeUmbuchungen={handleRecomputeUmbuchungen}
              onRecategorizeRules={handleRecategorizeRules}
              onRecategorizeAi={handleRecategorizeAi}
            />
          )}

          {dbStats.count > 0 && (
            <ImportHistory
              kontogruppen={kontogruppen}
              onChange={loadFromDb}
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
              {kontogruppen.length > 0 && (
                <KontogruppeFilter
                  kontogruppen={kontogruppen}
                  inhaber={inhaber}
                  selected={filter}
                  onSelect={setFilter}
                  counts={filterCounts}
                />
              )}

              <AuswertungFilter
                state={auswertungFilter}
                onChange={setAuswertungFilter}
                extraActiveCount={
                  (filter.inhaberIds.length > 0 ? 1 : 0) +
                  (filter.kontogruppeIds.length > 0 ? 1 : 0) +
                  (filter.includeNone ? 1 : 0)
                }
                onResetExtras={() => setFilter(EMPTY_FILTER)}
                extraHeaderSummary={
                  isFilterEmpty(filter) ? null : (
                    <span className="text-xs text-fg-muted">
                      {" · "}
                      {filter.kontogruppeIds.length > 0 && (
                        <span>
                          {filter.kontogruppeIds.length}{" "}
                          {filter.kontogruppeIds.length === 1
                            ? "Konto"
                            : "Konten"}
                        </span>
                      )}
                      {filter.inhaberIds.length > 0 && (
                        <span>
                          {filter.kontogruppeIds.length > 0 ? ", " : ""}
                          {filter.inhaberIds.length} Inhaber
                        </span>
                      )}
                      {filter.includeNone && (
                        <span>
                          {filter.kontogruppeIds.length > 0 ||
                          filter.inhaberIds.length > 0
                            ? ", "
                            : ""}
                          inkl. ohne Zuordnung
                        </span>
                      )}
                    </span>
                  )
                }
                headerSlot={
                  <FilterPresetMenu
                    presets={filterPresets}
                    currentPayload={currentPresetPayload}
                    hasActiveFilters={hasActiveFilters}
                    onApply={handleApplyPreset}
                    onSave={handleSavePreset}
                    onDelete={handleDeletePreset}
                  />
                }
              />

              <SummaryCards
                transactions={filteredTransactions}
                comparison={comparisonTransactions}
                includeUmbuchungen={auswertungFilter.includeUmbuchungen}
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
                      includeUmbuchungen={auswertungFilter.includeUmbuchungen}
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
                        comparison={comparisonTransactions}
                        type="ausgaben"
                        includeUmbuchungen={auswertungFilter.includeUmbuchungen}
                        onCategoryClick={(kategorie) =>
                          setDrillDown({ kategorie, type: "ausgaben" })
                        }
                      />
                      <CategoryChart
                        transactions={filteredTransactions}
                        comparison={comparisonTransactions}
                        type="einnahmen"
                        includeUmbuchungen={auswertungFilter.includeUmbuchungen}
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
                  onBulkKontogruppe={handleBulkKontogruppe}
                  onBulkUmbuchung={handleBulkUmbuchung}
                  onBulkDelete={handleBulkDelete}
                  onAiBulkDone={() => loadFromDb()}
                  onTagsChange={() => loadFromDb()}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
