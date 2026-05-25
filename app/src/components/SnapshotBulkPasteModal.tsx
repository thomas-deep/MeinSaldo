"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { parseSnapshotPaste } from "../lib/snapshot-parse";

interface Props {
  entryName: string;
  endpoint: string; // z. B. /api/assets/42/snapshots/bulk
  onClose: () => void;
  onSaved: () => void;
}

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

function formatDateDe(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

export default function SnapshotBulkPasteModal({
  entryName,
  endpoint,
  onClose,
  onSaved,
}: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    upserted: number;
  } | null>(null);

  const parsed = useMemo(() => parseSnapshotPaste(text), [text]);
  const canSubmit = parsed.rows.length > 0 && !busy;

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          snapshots: parsed.rows.map((r) => ({ date: r.date, value: r.value })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      const j = await res.json();
      setResult({ upserted: j.upserted ?? parsed.rows.length });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-12"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="font-editorial text-xl text-fg">
              Mehrere Werte einfügen
            </h3>
            <p className="mt-1 text-xs text-fg-muted">
              Zielposten: <span className="font-medium text-fg">{entryName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-fg-subtle hover:text-fg cursor-pointer"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {result ? (
          <div className="px-5 py-6">
            <div className="flex items-start gap-2 rounded-lg border border-positive bg-positive-soft px-3 py-2 text-sm text-positive">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                {result.upserted} Werte gespeichert. Bestehende Einträge an
                gleichem Datum wurden aktualisiert.
              </span>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={onClose}
                className="rounded-lg bg-fg px-3 py-1.5 text-xs font-medium text-fg-inverse cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 px-5 py-4">
              <p className="text-xs text-fg-muted">
                Pro Zeile <span className="font-mono text-fg">Datum</span> und{" "}
                <span className="font-mono text-fg">Wert</span>, getrennt durch{" "}
                <span className="font-mono text-fg">Tab</span>,{" "}
                <span className="font-mono text-fg">;</span> oder{" "}
                <span className="font-mono text-fg">,</span>. Datum als{" "}
                <span className="font-mono text-fg">TT.MM.JJJJ</span> oder{" "}
                <span className="font-mono text-fg">JJJJ-MM-TT</span>. Bestehende
                Werte mit gleichem Datum werden überschrieben.
              </p>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  "2026-01-31;12.500,00\n2026-02-28;12.640,50\n2026-03-31;12.880,00"
                }
                spellCheck={false}
                rows={8}
                className="w-full rounded-lg border border-border-strong bg-surface-active px-3 py-2 font-mono text-xs text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none"
                autoFocus
              />

              {(parsed.rows.length > 0 || parsed.errors.length > 0) && (
                <div className="rounded-lg border border-border bg-bg-muted/30">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-fg-faint">
                    <span>
                      Vorschau ·{" "}
                      <span className="text-positive">{parsed.rows.length} ok</span>
                      {parsed.errors.length > 0 && (
                        <>
                          {" · "}
                          <span className="text-danger">
                            {parsed.errors.length} Fehler
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto px-3 py-2 text-xs">
                    {parsed.rows.length > 0 && (
                      <table className="w-full font-mono">
                        <thead>
                          <tr className="text-left text-[10px] text-fg-faint">
                            <th className="py-1 pr-2 font-normal">#</th>
                            <th className="py-1 pr-2 font-normal">Datum</th>
                            <th className="py-1 text-right font-normal">Wert</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.rows.map((r) => (
                            <tr key={r.line} className="text-fg">
                              <td className="py-0.5 pr-2 text-fg-subtle">
                                {r.line}
                              </td>
                              <td className="py-0.5 pr-2">
                                {formatDateDe(r.date)}
                              </td>
                              <td className="py-0.5 text-right tabular-nums">
                                {eur.format(r.value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {parsed.errors.length > 0 && (
                      <ul className="mt-2 space-y-1 border-t border-border pt-2">
                        {parsed.errors.map((e) => (
                          <li
                            key={e.line}
                            className="flex items-start gap-2 text-[11px] text-danger"
                          >
                            <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                            <span>
                              Zeile {e.line}: {e.reason}{" "}
                              <span className="font-mono text-fg-subtle">
                                &bdquo;{e.raw.trim()}&ldquo;
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-bg-muted/30 px-5 py-3">
              <button
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-fg-soft hover:border-border-strong cursor-pointer disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {busy
                  ? "Speichere…"
                  : `${parsed.rows.length} Werte speichern`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
