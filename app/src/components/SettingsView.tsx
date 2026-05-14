"use client";

import { useState } from "react";
import { Users, Tag, Sparkles, ScrollText } from "lucide-react";
import KontogruppenManager from "./KontogruppenManager";
import CategoriesView from "./CategoriesView";
import AiSettings from "./AiSettings";
import LogsView from "./LogsView";
import { Kontogruppe } from "../lib/types";

interface SettingsViewProps {
  kontogruppen: Kontogruppe[];
  onKontogruppenChange: () => void;
}

type Section = "kontogruppen" | "kategorien" | "ki" | "logs";

const SECTIONS: { id: Section; label: string; icon: typeof Users }[] = [
  { id: "kontogruppen", label: "Kontogruppen", icon: Users },
  { id: "kategorien", label: "Kategorien", icon: Tag },
  { id: "ki", label: "KI-Kategorisierung", icon: Sparkles },
  { id: "logs", label: "Logs", icon: ScrollText },
];

export default function SettingsView({
  kontogruppen,
  onKontogruppenChange,
}: SettingsViewProps) {
  const [section, setSection] = useState<Section>("kontogruppen");

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <nav className="space-y-1">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors ${
                active
                  ? "bg-surface text-fg"
                  : "text-fg-muted hover:bg-surface/60 hover:text-fg"
              }`}
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </button>
          );
        })}
      </nav>

      <div>
        {section === "kontogruppen" && (
          <KontogruppenManager
            kontogruppen={kontogruppen}
            onChange={onKontogruppenChange}
          />
        )}
        {section === "kategorien" && <CategoriesView />}
        {section === "ki" && <AiSettings />}
        {section === "logs" && <LogsView />}
      </div>
    </div>
  );
}
