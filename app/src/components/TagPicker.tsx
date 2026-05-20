"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tags as TagsIcon } from "lucide-react";
import { Tag } from "../lib/types";

interface Props {
  transactionId: string;
  currentTags: Tag[];
  onChange: () => void;
}

export default function TagPicker({ transactionId, currentTags, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[] | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    const json = await res.json();
    setAllTags(json.tags as Tag[]);
  }, []);

  useEffect(() => {
    if (open && allTags === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- erstes Öffnen lädt die Tag-Liste
      void loadTags();
    }
  }, [open, allTags, loadTags]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  async function toggle(tag: Tag, checked: boolean) {
    setBusy(true);
    const next = checked
      ? [...currentTags.map((t) => t.id), tag.id]
      : currentTags.filter((t) => t.id !== tag.id).map((t) => t.id);
    const res = await fetch(
      `/api/transactions/${encodeURIComponent(transactionId)}/tags`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tagIds: next }),
      }
    );
    setBusy(false);
    if (res.ok) onChange();
  }

  const currentIds = new Set(currentTags.map((t) => t.id));

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Tags verwalten"
        aria-label="Tags verwalten"
        className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-fg-faint border border-border hover:text-fg hover:border-fg"
      >
        <TagsIcon className="h-3 w-3" />
      </button>
      {open && (
        <div
          className="absolute z-30 mt-1 w-56 rounded-lg border border-border bg-surface p-2 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {allTags === null ? (
            <div className="px-2 py-1 text-xs text-fg-muted">Lade…</div>
          ) : allTags.length === 0 ? (
            <div className="px-2 py-1 text-xs text-fg-muted">
              Erst in Einstellungen → Tags anlegen.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {allTags.map((t) => {
                const checked = currentIds.has(t.id);
                return (
                  <li key={t.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-bg ${
                        busy ? "opacity-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={busy}
                        onChange={(e) => void toggle(t, e.target.checked)}
                        className="h-3 w-3"
                      />
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: `${t.color}22`,
                          color: t.color,
                          border: `1px solid ${t.color}66`,
                        }}
                      >
                        {t.name}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
