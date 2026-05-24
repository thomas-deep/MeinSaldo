# Hinweise für KI-Coding-Sessions

Lokale Next.js-App zur Aufbereitung von Bankkonto-CSV-Exporten. Single-User, single-host, alles offline. Vor jeder größeren Änderung **`docs/`** lesen — besonders `TECHNICAL.md` (Architektur, Datenmodell, API). Der historische `AUDIT.md`-Report ist als Referenz erhalten, alle dortigen Bugs sind adressiert.

## Stack-Eigenheiten — bevor du Code schreibst

- **Next.js 16 mit Turbopack** — Breaking Changes gegenüber älteren Versionen. Falls eine API ungewohnt scheint, in `app/node_modules/next/dist/docs/` nachlesen statt aus Erinnerung schreiben. Siehe `app/AGENTS.md`.
- **React 19** mit den neuen Hook-Regeln (z.B. `react-hooks/set-state-in-effect`-Lint).
- **TypeScript strict-mode** ist aktiv — keine `any`, keine `as unknown as`-Workarounds einbauen, lieber Wrapper-Typen schreiben.
- **Tailwind v4** (`@import "tailwindcss"` statt klassischer Config).
- **better-sqlite3** ist sync — keine Promises auf DB-Calls, aber alle Schreib-Operationen müssen via `db.transaction(...)` laufen wenn mehrere Statements zusammengehören.
- **Recharts-Typen** sind zickig — siehe `CategoryChart.tsx` für das `as unknown as`-Anti-Pattern, das *vermieden* werden soll (Wrapper-Typen sind die richtige Lösung).

## Befehle

```bash
cd app
npm run dev          # Dev-Server auf :3000 (Turbopack)
npm run build        # Production-Build
npx tsc --noEmit     # TypeScript-Check
npx eslint .         # Lint
```

**Nach jeder nicht-trivialen Änderung** alle drei Checks laufen lassen, bevor „fertig" claimen.

## Verzeichnis-Konventionen

```
app/src/app/        Next.js App Router (Seiten + API-Routes)
app/src/components/ React-Komponenten — eine Komponente pro Datei
app/src/lib/        Pure Logic (DB, Parser, Kategorisierung, LLM)
app/data/           SQLite-DB (gitignored, NICHT anfassen)
docs/               Doku — bei Architektur-Änderungen aktualisieren
```

## DON'Ts

- **Niemals** in `app/data/` schreiben oder es löschen — enthält echte Nutzerdaten
- **Niemals** `.next/`, `node_modules/`, `data/` committen (sind in `.gitignore`)
- **Niemals** Personenbezogenes (Namen, IBANs, E-Mails) in Code, Docs oder Tests einbauen — siehe Git-Historie für vergangene Spuren-Bereinigung
- **Keine** Server-Auth einbauen ohne explizite Absprache (App ist bewusst single-user/localhost)
- **Keine** externen Telemetrie-/Analytics-Dienste einbinden

## Konventionen für neue Features

### Neue Bank-CSV unterstützen
1. `src/lib/field-mapping.ts`: neuen `BankPreset` ans Array anhängen
2. Falls Header-Metadaten oder kombinierte Felder: `preprocess` / `rowTransform` schreiben
3. `docs/CSV_FORMATS.md` ergänzen
4. Mit echtem Sample-CSV testen (im Browser, nicht nur via curl)

### Neue Kategorie
1. `src/lib/categories.ts`: Eintrag in `categoryRules`, Reihenfolge beachten (spezifisch vor generisch)
2. Bestehende Daten werden erst beim nächsten Import neu kategorisiert
3. UI-Übersicht unter Einstellungen → Kategorien zeigt das Resultat automatisch

### Neue API-Route
1. Unter `src/app/api/<name>/route.ts`
2. **Immer** `try/catch` um `req.json()` (sonst 500 bei invalidem Body)
3. Eingaben validieren (idealerweise mit Zod — ist noch nicht installiert)
4. Konsistente Fehlerformate: `{ error: "msg" }` mit `{ status: 4xx }`

### DB-Schema-Änderung
1. `src/lib/db.ts`: `ensureColumn(db, "table", "col", "TYPE DEFAULT ...")` in `getDb()`
2. Kein destructive Schema-Change (DROP, ALTER COLUMN) — keine Migrations-Versionierung vorhanden
3. Falls echte Migration nötig: erst hier nachrüsten, dann Schema ändern

## Sprache & Stil

- **UI-Texte auf Deutsch** — keine englischen Strings im UI (nur in technischen Kommentaren/Logs)
- **Code-Bezeichner Englisch** für TS/SQL (variables, function names) — gemischt nur dort, wo es um deutsche Bank-Begriffe geht (`buchungstag`, `verwendungszweck`, `kontogruppe`)
- **Kommentare sparsam** — nur wenn das *Warum* nicht offensichtlich ist
- **Keine Emojis** im Code/UI ohne explizite Aufforderung
- **Currency formatting** über `Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })`
- **Datumsformat in UI**: `TT.MM.JJJJ`, intern immer ISO (`YYYY-MM-DD`)

## Verifikation vor „fertig"-Claim

Bei UI-Änderungen: Dev-Server starten, Feature im Browser durchspielen — der Code-Reviewer im AUDIT-Report hat mehrere Fehler gefunden, die nur durch Browser-Test sichtbar werden (Layout-Brüche, Filter-Counts, Drill-Down-Flows).

Bei Logik-Änderungen: mindestens ein Beispiel-Szenario manuell durchspielen (echte oder generierte CSV), nicht nur Build/Lint.

## Genutzte Skills (zur Referenz)

In bisherigen Sessions an diesem Repo hilfreich:
- **`ui-ux-pro-max`** — wurde für das Fintech-Dark-Theme genutzt (Design-System, Charts, Kategorisierung von Farb-/Font-Choices). Installiert unter `.agents/skills/` (gitignored).
- **`superpowers:brainstorming`** — vor jeder größeren Feature-Entscheidung (Kontogruppen-Modell, Drill-Down-UX, Ollama-Integration)
- **`superpowers:verification-before-completion`** — Browser-Verify vor Claim
- **`security-review`** — für den Audit-Pass (scheitert ohne `origin/HEAD`-Remote, ist also nur sinnvoll sobald ein Remote gesetzt ist)

## Empfohlene weitere Skills

Falls du oft an diesem Repo arbeitest, könnte sinnvoll sein:

```bash
# React-Best-Practices (Hooks, Performance, Patterns)
npx skills add vercel-labs/agent-skills@vercel-react-best-practices

# Webapp-Testing (Playwright-Patterns, da Tests bisher fehlen)
npx skills add anthropics/skills@webapp-testing

# Next.js App Router (für tiefere Routing-/Caching-Themen)
npx skills add wshobson/agents@nextjs-app-router-patterns

# TypeScript Advanced Types (für strikteres Typing, Ersatz der as-casts)
npx skills add wshobson/agents@typescript-advanced-types
```

## Roadmap

Aktuelle Priorisierung in [`ROADMAP.md`](ROADMAP.md). Die im historischen `docs/AUDIT.md` aufgelisteten Bugs sind alle adressiert — bei neuen Findings dort einen Eintrag mit Datum ergänzen.
