"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Repeat,
  Calendar,
  Check,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { RecurringSeries, RecurringInterval } from "../lib/recurring";
import { Tag } from "../lib/types";

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const intervalLabel: Record<RecurringInterval, string> = {
  monthly: "monatlich",
  quarterly: "quartalsweise",
  yearly: "jährlich",
};

export default function RecurringView() {
  const [series, setSeries] = useState<RecurringSeries[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const [recRes, katRes, tagRes] = await Promise.all([
      fetch("/api/recurring", { signal }),
      fetch("/api/kategorien", { signal }),
      fetch("/api/tags", { signal }),
    ]);
    if (!recRes.ok) throw new Error("Laden fehlgeschlagen");
    const recJson = await recRes.json();
    const katJson = await katRes.json();
    const tagJson = await tagRes.json();
    setSeries(recJson.series as RecurringSeries[]);
    setCategories(
      (katJson.kategorien as { name: string }[]).map((k) => k.name)
    );
    setTags(tagJson.tags as Tag[]);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Mount-Fetch mit Abort, setState nur im Fehlerfall
    load(ctrl.signal).catch((e) => {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    });
    return () => ctrl.abort();
  }, [load]);

  if (error) {
    return (
      <div className="rounded-lg border border-danger bg-danger-soft p-4 text-sm text-danger">
        {error}
      </div>
    );
  }

  if (!series) {
    return <div className="text-sm text-fg-muted">Lade…</div>;
  }

  if (series.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-fg-muted">
        Noch keine wiederkehrenden Buchungen erkannt. Sobald drei oder mehr
        regelmäßige Zahlungen vom selben Empfänger gebucht wurden, erscheinen
        sie hier.
      </div>
    );
  }

  const withChange = series.filter((s) => s.priceChanged);
  const stable = series.filter((s) => !s.priceChanged);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h2 className="font-editorial text-2xl text-fg">
          Wiederkehrende Zahlungen
        </h2>
        <span className="text-sm text-fg-muted">
          {series.length} Serie{series.length === 1 ? "" : "n"}
        </span>
      </header>

      {withChange.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-warn">
            <AlertTriangle className="h-4 w-4" />
            Preisänderung erkannt ({withChange.length})
          </h3>
          <div className="rounded-lg border border-warn bg-warn-soft">
            {withChange.map((s) => (
              <SeriesRow
                key={s.key}
                series={s}
                categories={categories}
                tags={tags}
                onApplied={() => void load()}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-fg-muted">
          Stabile Serien ({stable.length})
        </h3>
        <div className="rounded-lg border border-border bg-surface">
          {stable.map((s) => (
            <SeriesRow
              key={s.key}
              series={s}
              categories={categories}
              tags={tags}
              onApplied={() => void load()}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SeriesRow({
  series: s,
  categories,
  tags,
  onApplied,
}: {
  series: RecurringSeries;
  categories: string[];
  tags: Tag[];
  onApplied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null
  );
  const delta = s.latestBetrag - s.avgBetrag;

  async function apply(body: Record<string, unknown>, label: string) {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/transactions-bulk", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: s.transactionIds, ...body }),
      });
      if (res.ok) {
        const json = await res.json();
        setResult({
          ok: true,
          msg: `${label} auf ${json.updated} Buchungen angewendet`,
        });
        onApplied();
      } else {
        setResult({ ok: false, msg: `${label}: fehlgeschlagen` });
      }
    } catch {
      setResult({ ok: false, msg: `${label}: fehlgeschlagen` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium text-fg">{s.name}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-fg-muted">
            <span className="flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {intervalLabel[s.interval]} · {s.occurrences} Buchungen
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              zuletzt {formatDate(s.lastDate)} · nächste ≈{" "}
              {formatDate(s.nextExpected)}
            </span>
          </div>
          {(s.categories.length > 0 || s.tags.length > 0) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {s.categories.map((c) => (
                <span
                  key={c}
                  className="rounded border border-border bg-bg-muted px-1.5 py-0.5 text-[10px] font-medium text-fg-muted"
                >
                  {c}
                </span>
              ))}
              {s.tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: `${t.color}22`,
                    color: t.color,
                    border: `1px solid ${t.color}66`,
                  }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <div
            className={`text-sm tabular-nums ${
              s.latestBetrag < 0 ? "text-danger" : "text-positive"
            }`}
          >
            {eurFormatter.format(s.latestBetrag)}
          </div>
          {s.priceChanged && (
            <div className="text-xs tabular-nums text-warn">
              ø {eurFormatter.format(s.avgBetrag)} ({delta > 0 ? "+" : ""}
              {eurFormatter.format(delta)})
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Kategorie/Tag zuordnen"
          title="Kategorie/Tag auf alle Buchungen dieser Serie anwenden"
          className={`rounded-md border border-border p-1.5 ${
            open ? "bg-bg-muted text-fg" : "text-fg-muted hover:text-fg"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs text-fg-muted">
            Auf alle {s.occurrences} Buchungen:
          </span>
          <select
            disabled={busy}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                void apply({ kategorie: e.target.value }, "Kategorie");
              }
            }}
            className="rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
          >
            <option value="">Kategorie wählen…</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            disabled={busy || tags.length === 0}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                void apply({ addTagId: Number(e.target.value) }, "Tag");
              }
            }}
            className="rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
          >
            <option value="">
              {tags.length === 0 ? "Keine Tags angelegt" : "Tag hinzufügen…"}
            </option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {result && (
            <span
              className={`flex items-center gap-1 text-xs ${
                result.ok ? "text-positive" : "text-danger"
              }`}
            >
              {result.ok ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {result.msg}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
