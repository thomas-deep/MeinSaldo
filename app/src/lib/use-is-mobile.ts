"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)";

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

// SSR/Prerender kennt keine Viewport-Breite — Desktop ist der sichere Default,
// der Client korrigiert vor dem ersten Paint via useSyncExternalStore.
function getServerSnapshot(): boolean {
  return false;
}

/** True auf Smartphone-Viewports (< 768px), reagiert live auf Resize/Rotation. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
