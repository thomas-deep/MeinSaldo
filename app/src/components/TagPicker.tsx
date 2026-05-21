"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tags as TagsIcon } from "lucide-react";
import { Tag } from "../lib/types";

interface Props {
  transactionId: string;
  currentTags: Tag[];
  onChange: () => void;
}

const POPOVER_WIDTH = 224;

export default function TagPicker({ transactionId, currentTags, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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
      const target = e.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const reposition = () => setOpen(false);
    window.addEventListener("mousedown", handler);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  function openPopover() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.max(
      8,
      Math.min(rect.right - POPOVER_WIDTH, window.innerWidth - POPOVER_WIDTH - 8)
    );
    setPos({ top: rect.bottom + 4, left });
    setOpen(true);
  }

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
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (open) setOpen(false);
          else openPopover();
        }}
        title="Tags verwalten"
        aria-label="Tags verwalten"
        className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-fg-faint border border-border hover:text-fg hover:border-fg"
      >
        <TagsIcon className="h-3 w-3" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: POPOVER_WIDTH,
              maxHeight: "50vh",
              overflowY: "auto",
            }}
            className="z-50 rounded-lg border border-border bg-surface p-2 shadow-xl"
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
          </div>,
          document.body
        )}
    </>
  );
}
