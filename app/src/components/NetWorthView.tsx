"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Plus, Trash2, Activity } from "lucide-react";
import {
  NetWorthEntry,
  NetWorthHistoryPoint,
  NetWorthSnapshot,
} from "../lib/types";
import ConfirmDialog from "./ConfirmDialog";
import { parseGermanNumber } from "../lib/number-format";

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const eurCompact = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatDate(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

interface NetWorthData {
  assets: NetWorthEntry[];
  liabilities: NetWorthEntry[];
  history: NetWorthHistoryPoint[];
  totals: { assets: number; liabilities: number; net: number };
}

export default function NetWorthView() {
  const [data, setData] = useState<NetWorthData | null>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/networth");
    const json = await res.json();
    setData(json as NetWorthData);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Fetch
    void load();
  }, [load]);

  if (!data) return <div className="text-sm text-fg-muted">Lade…</div>;

  const { assets, liabilities, history, totals } = data;

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h2 className="font-editorial text-2xl text-fg">Vermögen</h2>
      </header>

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <SummaryCard
          label="Vermögen"
          value={totals.assets}
          valueColor="text-positive"
        />
        <SummaryCard
          label="Verbindlichkeiten"
          value={totals.liabilities}
          valueColor="text-danger"
        />
        <SummaryCard
          label="Nettovermögen"
          value={totals.net}
          valueColor={totals.net >= 0 ? "text-positive" : "text-danger"}
        />
      </section>

      {history.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-medium text-fg-muted">
            Monatlicher Verlauf
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.1} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickFormatter={(s: string) => s.slice(0, 7)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickFormatter={(v: number) => eurCompact.format(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                  formatter={(v) => (typeof v === "number" ? eur.format(v) : String(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="assets"
                  name="Vermögen"
                  stroke="#10b981"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="liabilities"
                  name="Verbindlichkeiten"
                  stroke="#ef4444"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Netto"
                  stroke="currentColor"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <EntryList
          title="Vermögen"
          entries={assets}
          onAddClick={() => setShowAddAsset(true)}
          onReload={load}
          kind="asset"
        />
        <EntryList
          title="Verbindlichkeiten"
          entries={liabilities}
          onAddClick={() => setShowAddLiability(true)}
          onReload={load}
          kind="liability"
        />
      </section>

      {showAddAsset && (
        <AddEntryModal
          kind="asset"
          onClose={() => setShowAddAsset(false)}
          onCreated={load}
        />
      )}
      {showAddLiability && (
        <AddEntryModal
          kind="liability"
          onClose={() => setShowAddLiability(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: number;
  valueColor: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-md)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">
        {label}
      </p>
      <p
        className={`mt-3 font-editorial text-[44px] leading-[0.95] tracking-tight ${valueColor}`}
      >
        <span className="tabular-nums">{eur.format(value)}</span>
      </p>
    </div>
  );
}

function EntryList({
  title,
  entries,
  onAddClick,
  onReload,
  kind,
}: {
  title: string;
  entries: NetWorthEntry[];
  onAddClick: () => void;
  onReload: () => void;
  kind: "asset" | "liability";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-medium text-fg">{title}</h3>
        <button
          onClick={onAddClick}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-fg-muted hover:text-fg"
        >
          <Plus className="h-3 w-3" />
          Hinzufügen
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-fg-muted">
          Noch nichts erfasst.
        </div>
      ) : (
        <ul>
          {entries.map((e) => (
            <EntryRow key={`${e.source}-${e.id}`} entry={e} onReload={onReload} kind={kind} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryRow({
  entry: e,
  onReload,
  kind,
}: {
  entry: NetWorthEntry;
  onReload: () => void;
  kind: "asset" | "liability";
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState<NetWorthSnapshot[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const isManual = e.source === "manual";
  const path = kind === "asset" ? "assets" : "liabilities";

  async function loadHistory() {
    const res = await fetch(`/api/${path}/${e.id}/snapshots`);
    const json = await res.json();
    setHistory(json.snapshots as NetWorthSnapshot[]);
  }

  async function handleSave() {
    const v = parseGermanNumber(value);
    if (v === null) return;
    await fetch(`/api/${path}/${e.id}/snapshots`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, value: v }),
    });
    setEditing(false);
    setValue("");
    if (showHistory) await loadHistory();
    onReload();
  }

  async function confirmDelete() {
    await fetch(`/api/${path}/${e.id}`, { method: "DELETE" });
    setConfirmOpen(false);
    onReload();
  }

  async function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history === null) await loadHistory();
  }

  return (
    <li className="border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-fg">
              {e.displayPrefix ? `${e.displayPrefix} · ` : ""}
              {e.name}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                isManual
                  ? "bg-surface text-fg-muted border border-border"
                  : "bg-positive-soft text-positive"
              }`}
            >
              {isManual ? e.kind : "aus Konto"}
            </span>
          </div>
          <div className="text-xs text-fg-muted">
            {e.latestValue !== null
              ? `${formatDate(e.latestDate)}`
              : "kein Wert"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm tabular-nums text-fg">
            {e.latestValue !== null ? eur.format(e.latestValue) : "—"}
          </div>
          <div className="mt-1 flex items-center gap-1 justify-end">
            {isManual && (
              <>
                <button
                  onClick={toggleHistory}
                  aria-label="Verlauf anzeigen"
                  title="Werteverlauf"
                  className={`rounded border border-border p-1 ${
                    showHistory
                      ? "bg-bg-muted text-fg"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="rounded border border-border px-1.5 py-0.5 text-[10px] text-fg-muted hover:text-fg"
                >
                  Wert
                </button>
                <button
                  onClick={() => setConfirmOpen(true)}
                  aria-label="Löschen"
                  className="text-fg-muted hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {editing && isManual && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
          />
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Wert in EUR"
            className="flex-1 rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
          />
          <button
            onClick={handleSave}
            className="rounded bg-fg px-2 py-1 text-xs text-fg-inverse"
          >
            Speichern
          </button>
        </div>
      )}
      {showHistory && isManual && (
        <div className="mt-3 border-t border-border pt-3">
          {history === null ? (
            <p className="text-xs text-fg-muted">Lade Verlauf…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-fg-muted">
              Noch keine Werte erfasst — über &bdquo;Wert&ldquo; einen
              datierten Eintrag anlegen.
            </p>
          ) : (
            <div className="space-y-2">
              {history.length >= 2 && (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid stroke="currentColor" strokeOpacity={0.1} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "currentColor" }}
                        tickFormatter={(s: string) => s.slice(0, 7)}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "currentColor" }}
                        tickFormatter={(v: number) => eurCompact.format(v)}
                        width={56}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          fontSize: 12,
                        }}
                        formatter={(v) =>
                          typeof v === "number" ? eur.format(v) : String(v)
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name={e.name}
                        stroke="currentColor"
                        dot
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <ul className="space-y-0.5">
                {[...history].reverse().map((s) => (
                  <li
                    key={s.date}
                    className="flex justify-between text-xs text-fg-muted"
                  >
                    <span>{formatDate(s.date)}</span>
                    <span className="tabular-nums text-fg">
                      {eur.format(s.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={kind === "asset" ? "Vermögensposten löschen?" : "Verbindlichkeit löschen?"}
        message={`„${e.name}" und alle erfassten Werte werden gelöscht.`}
        confirmLabel="Löschen"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  );
}

function AddEntryModal({
  kind,
  onClose,
  onCreated,
}: {
  kind: "asset" | "liability";
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [note, setNote] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const path = kind === "asset" ? "assets" : "liabilities";
    await fetch(`/api/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        kind: type.trim() || "Sonstiges",
        note: note.trim() || null,
      }),
    });
    onCreated();
    onClose();
  }

  const typeHint =
    kind === "asset"
      ? "z. B. Depot, Immobilie, Bargeld, Kryptowallet"
      : "z. B. Hypothek, Kredit, Ratenzahlung";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <form
        onSubmit={handleCreate}
        className="w-full max-w-md space-y-3 rounded-lg border border-border bg-surface p-5"
      >
        <h3 className="font-editorial text-lg text-fg">
          {kind === "asset" ? "Vermögen hinzufügen" : "Verbindlichkeit hinzufügen"}
        </h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (z. B. Depot ING)"
          maxLength={64}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-fg"
          autoFocus
        />
        <div>
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Typ (optional)"
            maxLength={32}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-fg"
          />
          <p className="mt-1 text-xs text-fg-subtle">{typeHint}</p>
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notiz (optional)"
          maxLength={500}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-fg"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1.5 text-sm text-fg-muted"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="rounded bg-fg px-3 py-1.5 text-sm text-fg-inverse"
          >
            Anlegen
          </button>
        </div>
      </form>
    </div>
  );
}
