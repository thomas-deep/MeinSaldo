"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Tag } from "lucide-react";
import { categoryRules } from "../lib/categories";

export default function CategoriesView() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50">
      <div className="border-b border-slate-700 px-5 py-4">
        <div className="flex items-center gap-3">
          <Tag className="h-5 w-5 text-slate-400" />
          <div>
            <h3 className="text-sm font-medium text-slate-200">
              Kategorisierungs-Regeln ({categoryRules.length})
            </h3>
            <p className="text-xs text-slate-500">
              Diese Regeln werden auf Verwendungszweck, Zahlungsbeteiligten und
              Buchungstext angewendet (case-insensitive).
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-700/50">
        {categoryRules.map((rule) => {
          const isOpen = expanded === rule.kategorie;
          const total = rule.keywords.length + rule.namePatterns.length;
          return (
            <div key={rule.kategorie}>
              <button
                onClick={() => setExpanded(isOpen ? null : rule.kategorie)}
                className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-700/20 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  )}
                  <span className="text-sm font-medium text-slate-200">
                    {rule.kategorie}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {total} Einträge
                </span>
              </button>
              {isOpen && (
                <div className="space-y-3 bg-slate-900/30 px-5 py-3">
                  {rule.keywords.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-slate-400">
                        Keywords (Treffer im Text)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rule.keywords.map((k) => (
                          <span
                            key={k}
                            className="rounded bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {rule.namePatterns.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-slate-400">
                        Namens-Patterns (Treffer im Empfänger/Sender)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rule.namePatterns.map((p) => (
                          <span
                            key={p}
                            className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
