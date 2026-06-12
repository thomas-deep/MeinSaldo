"use client";

import { useState } from "react";
import {
  Users,
  Tag,
  Tags as TagsIcon,
  Sparkles,
  ScrollText,
  Database,
} from "lucide-react";
import InhaberManager from "./InhaberManager";
import KontogruppenManager from "./KontogruppenManager";
import CategoriesView from "./CategoriesView";
import TagManager from "./TagManager";
import AiSettings from "./AiSettings";
import LogsView from "./LogsView";
import DatabaseBackup from "./DatabaseBackup";
import { Inhaber, Kontogruppe } from "../lib/types";

interface SettingsViewProps {
  kontogruppen: Kontogruppe[];
  inhaber: Inhaber[];
  onKontogruppenChange: () => void;
}

type Section = "konten" | "kategorien" | "tags" | "ki" | "datenbank" | "logs";

const SECTIONS: { id: Section; label: string; icon: typeof Users }[] = [
  { id: "konten", label: "Inhaber & Konten", icon: Users },
  { id: "kategorien", label: "Kategorien", icon: Tag },
  { id: "tags", label: "Tags", icon: TagsIcon },
  { id: "ki", label: "KI-Kategorisierung", icon: Sparkles },
  { id: "datenbank", label: "Datenbank", icon: Database },
  { id: "logs", label: "Logs", icon: ScrollText },
];

export default function SettingsView({
  kontogruppen,
  inhaber,
  onKontogruppenChange,
}: SettingsViewProps) {
  const [section, setSection] = useState<Section>("konten");

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
        {section === "konten" && (
          <div className="space-y-6">
            <InhaberManager
              inhaber={inhaber}
              onChange={onKontogruppenChange}
            />
            <KontogruppenManager
              kontogruppen={kontogruppen}
              inhaber={inhaber}
              onChange={onKontogruppenChange}
            />
          </div>
        )}
        {section === "kategorien" && <CategoriesView />}
        {section === "tags" && <TagManager />}
        {section === "ki" && <AiSettings />}
        {section === "datenbank" && <DatabaseBackup />}
        {section === "logs" && <LogsView />}
      </div>
    </div>
  );
}
