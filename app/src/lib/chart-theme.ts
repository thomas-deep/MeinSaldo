"use client";

import { useEffect, useState } from "react";

/**
 * Liest die aktuellen Theme-Token-CSS-Variablen vom :root-Element.
 * Wird bei Theme-Wechsel (class-toggle auf <html>) neu evaluiert via
 * MutationObserver, damit Recharts inline-Styles theme-aware bleiben.
 */
export interface ChartTheme {
  bg: string;
  surface: string;
  border: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  grid: string;
  brand: string;
  positive: string;
  danger: string;
}

function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function snapshot(): ChartTheme {
  return {
    bg: readVar("--bg", "#000"),
    surface: readVar("--surface", "#111"),
    border: readVar("--border", "#333"),
    fg: readVar("--fg", "#fff"),
    fgMuted: readVar("--fg-muted", "#bbb"),
    fgSubtle: readVar("--fg-subtle", "#888"),
    grid: readVar("--chart-grid", "#222"),
    brand: readVar("--brand", "#3b82f6"),
    positive: readVar("--positive", "#10b981"),
    danger: readVar("--danger", "#ef4444"),
  };
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(() => snapshot());

  useEffect(() => {
    // Re-read nach mount, dann observer für Theme-Switches
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Re-sync nach Hydration
    setTheme(snapshot());
    const obs = new MutationObserver(() => setTheme(snapshot()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  return theme;
}

/**
 * Palette für Kategorie-Charts. oklch-Werte über den Hue-Kreis verteilt,
 * konsistent über Light/Dark (Lightness-Anpassung via two-tone).
 * Achtung: Recharts kann oklch lesen — moderne Browser unterstützen es.
 */
export function categoryPalette(resolved: "light" | "dark"): string[] {
  const L = resolved === "dark" ? "0.72" : "0.55";
  const C = "0.13";
  // Sorgfältig kuratierte Hue-Abstände — wechselt warm/kühl, vermeidet Nachbarn
  const hues = [
    240, 165, 35, 305, 75, 200, 110, 0, 270, 145, 50, 320, 85, 220, 175, 25,
  ];
  return hues.map((h) => `oklch(${L} ${C} ${h})`);
}
