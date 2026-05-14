"use client";

import { ReactNode } from "react";

type Accent = "blue" | "purple";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  hint?: ReactNode;
  title?: string;
  accent?: Accent;
}

const ACCENT_TRACK_ON: Record<Accent, string> = {
  blue: "bg-blue-500",
  purple: "bg-purple-500",
};

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  hint,
  title,
  accent = "blue",
}: ToggleProps) {
  return (
    <label
      title={title}
      className={`inline-flex items-center gap-2.5 text-xs ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer text-slate-300"
      }`}
    >
      <span className="relative inline-flex h-5 w-9 flex-shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`absolute inset-0 rounded-full transition-colors ${
            checked ? ACCENT_TRACK_ON[accent] : "bg-slate-600"
          } peer-focus-visible:ring-2 peer-focus-visible:ring-slate-400`}
        />
        <span
          className={`absolute left-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
      {(label || hint) && (
        <span className="flex flex-col leading-tight">
          {label && <span>{label}</span>}
          {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
        </span>
      )}
    </label>
  );
}
