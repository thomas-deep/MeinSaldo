"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { FilterPreset } from "../lib/types";

interface FilterPresetMenuProps {
  presets: FilterPreset[];
  /** JSON-Repräsentation der aktuell aktiven Filter-Kombi. Wird mit
   *  preset.payload verglichen, um den aktiven Eintrag und die Sichtbarkeit
   *  des Speichern-Buttons zu steuern. */
  currentPayload: string;
  /** True, wenn überhaupt Filter aktiv sind. Schließt das Speichern eines
   *  „leeren" Presets aus. */
  hasActiveFilters: boolean;
  onApply: (preset: FilterPreset) => void;
  onSave: (name: string) => Promise<{ error?: string } | void>;
  onDelete: (preset: FilterPreset) => void;
}

export default function FilterPresetMenu({
  presets,
  currentPayload,
  hasActiveFilters,
  onApply,
  onSave,
  onDelete,
}: FilterPresetMenuProps) {
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const matched = presets.find((p) => p.payload === currentPayload) ?? null;
  const canSave = hasActiveFilters && !matched;

  const closeMenu = () => {
    setOpen(false);
    setSaveName("");
    setSaveError(null);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const submitSave = async () => {
    const name = saveName.trim();
    if (!name) return;
    setIsSaving(true);
    setSaveError(null);
    const res = await onSave(name);
    setIsSaving(false);
    if (res && res.error) {
      setSaveError(res.error);
      return;
    }
    setSaveName("");
    closeMenu();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (open) closeMenu();
          else setOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors cursor-pointer ${
          matched
            ? "border-brand/40 bg-brand-soft text-brand"
            : "border-border bg-surface text-fg-muted hover:text-fg"
        }`}
        title="Filter-Presets"
      >
        <Bookmark className="h-3 w-3" />
        <span className="max-w-[12rem] truncate">
          {matched ? matched.name : "Preset"}
        </span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-xl ring-1 ring-black/[0.04]"
        >
          {presets.length > 0 && (
            <>
              <p className="px-4 pt-3 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-fg-faint">
                Gespeicherte Presets
              </p>
              <ul className="max-h-72 overflow-y-auto pb-2">
                {presets.map((p) => {
                  const isActive = matched?.id === p.id;
                  return (
                    <li key={p.id} className="group">
                      <div
                        className={`mx-1.5 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                          isActive
                            ? "bg-brand-soft"
                            : "hover:bg-bg-muted"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onApply(p);
                            closeMenu();
                          }}
                          className="flex flex-1 items-center gap-2 truncate text-left cursor-pointer"
                        >
                          {isActive ? (
                            <Check className="h-3.5 w-3.5 flex-shrink-0 text-brand" />
                          ) : (
                            <span className="h-3.5 w-3.5 flex-shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              isActive ? "font-medium text-brand" : "text-fg"
                            }`}
                          >
                            {p.name}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(p)}
                          className="rounded p-1 text-fg-subtle opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100 cursor-pointer"
                          title={`„${p.name}" löschen`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {canSave && (
            <div
              className={`px-4 py-3 ${
                presets.length === 0
                  ? ""
                  : "border-t border-border bg-bg-muted/30"
              }`}
            >
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-fg-faint">
                Aktuelle Kombination speichern
              </p>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => {
                    setSaveName(e.target.value);
                    setSaveError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitSave();
                  }}
                  placeholder="z.B. Letzte 12 Monate · Ausgaben"
                  className="w-full rounded-md border border-border-strong bg-surface-active px-2.5 py-1.5 text-xs text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={submitSave}
                  disabled={!saveName.trim() || isSaving}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-brand-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Als neues Preset speichern
                </button>
              </div>
              {saveError && (
                <p className="mt-2 text-[11px] text-danger">{saveError}</p>
              )}
            </div>
          )}

          {!canSave && presets.length > 0 && (
            <p className="border-t border-border bg-bg-muted/30 px-4 py-2.5 text-[10px] text-fg-subtle">
              Aktuelle Filter entsprechen einem vorhandenen Preset.
            </p>
          )}

          {presets.length === 0 && !canSave && (
            <div className="px-4 py-4 text-[11px] leading-relaxed text-fg-subtle">
              Noch keine Filter-Presets gespeichert. Setze unten einen Filter
              (Zeitraum, Typ, Suche…), dann erscheint hier ein
              &bdquo;Speichern&ldquo;-Feld.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
