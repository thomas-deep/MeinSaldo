"use client";

import { useEffect, useState } from "react";
import { X, ArrowLeftRight } from "lucide-react";
import { Kontogruppe, Transaction, formatKontogruppe } from "../../lib/types";
import { eurSigned, formatDate } from "../../lib/mobile-format";

interface MobileTransactionSheetProps {
  transaction: Transaction;
  kontogruppen: Kontogruppe[];
  kategorien: string[];
  onCategoryChange: (id: string, kategorie: string) => Promise<void> | void;
  onClose: () => void;
}

/**
 * Bottom-Sheet mit Buchungsdetails und Kategorie-Wechsel.
 * Schließt über Backdrop-Tap, X-Button oder Escape.
 */
export default function MobileTransactionSheet({
  transaction: t,
  kontogruppen,
  kategorien,
  onCategoryChange,
  onClose,
}: MobileTransactionSheetProps) {
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    // Hintergrund-Scroll sperren, solange das Sheet offen ist
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const kg =
    t.kontogruppeId != null
      ? kontogruppen.find((k) => k.id === t.kontogruppeId)
      : undefined;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Buchungsdetails">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="fade-in absolute inset-0 cursor-pointer bg-black/55"
      />
      <div className="sheet-up absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-bg-elev px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-2 shadow-[var(--shadow-lg)]">
        <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border-strong" />

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">
              {t.nameZahlungsbeteiligter || t.verwendungszweck || "—"}
            </p>
            <p className="text-xs text-fg-subtle">
              {formatDate(t.buchungstag)}
              {t.valutadatum && t.valutadatum !== t.buchungstag
                ? ` · Valuta ${formatDate(t.valutadatum)}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-fg-muted active:bg-surface-hover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p
          className={`mt-3 font-editorial text-[40px] leading-none tracking-tight tabular-nums ${
            t.betrag >= 0 ? "text-positive" : "text-fg"
          }`}
        >
          {eurSigned.format(t.betrag)}
        </p>

        {t.isUmbuchung && (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-bg-muted px-3 py-2 text-xs text-fg-muted">
            <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
            Umbuchung zwischen eigenen Konten — zählt nicht in die Summen.
          </p>
        )}

        <dl className="mt-5 space-y-4">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-faint">
              Kategorie
            </dt>
            <dd className="mt-1.5">
              <select
                value={t.kategorie}
                disabled={saving}
                onChange={async (e) => {
                  setSaving(true);
                  try {
                    await onCategoryChange(t.id, e.target.value);
                  } finally {
                    setSaving(false);
                  }
                }}
                aria-label="Kategorie ändern"
                className="min-h-11 w-full cursor-pointer rounded-xl border border-border bg-surface px-3 text-base text-fg focus:border-border-strong focus:outline-none disabled:opacity-50"
              >
                {/* Falls die aktuelle Kategorie nicht (mehr) in der Liste ist */}
                {!kategorien.includes(t.kategorie) && (
                  <option value={t.kategorie}>{t.kategorie}</option>
                )}
                {kategorien.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </dd>
          </div>

          {t.verwendungszweck && (
            <SheetRow label="Verwendungszweck" value={t.verwendungszweck} />
          )}
          {t.buchungstext && (
            <SheetRow label="Buchungstext" value={t.buchungstext} />
          )}
          {kg && <SheetRow label="Konto" value={formatKontogruppe(kg)} />}
          {!kg && t.kontoBezeichnung && (
            <SheetRow label="Konto" value={t.kontoBezeichnung} />
          )}
          {t.ibanZahlungsbeteiligter && (
            <SheetRow
              label="IBAN Gegenseite"
              value={t.ibanZahlungsbeteiligter}
              mono
            />
          )}
          {t.tags && t.tags.length > 0 && (
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-faint">
                Tags
              </dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {t.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full px-2.5 py-1 text-xs font-medium text-fg-inverse"
                    style={{ background: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

function SheetRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-faint">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm leading-relaxed text-fg-soft ${
          mono ? "font-mono text-[13px]" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
