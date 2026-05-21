# Mitmachen

Danke, dass du beitragen willst. Die App ist bewusst klein und lokal — Beiträge dürfen das Konzept (Single-User, Localhost, keine Telemetrie, keine externen Services) **nicht aufweichen**.

## Setup

```bash
git clone <fork-url>
cd MeinSaldo/app
npm install
npm run dev      # http://localhost:3000
```

Voraussetzungen: Node 20+, macOS oder Linux (besser-sqlite3 baut native). Optional: lokales [Ollama](https://ollama.com) für KI-Kategorisierung.

## Checks vor jedem PR

Nicht-trivial heißt: mehr als eine Tippfehler-Korrektur.

```bash
cd app
npx tsc --noEmit     # TypeScript strict
npx eslint .         # Linting
npm test             # Vitest
```

UI-Änderungen zusätzlich im Browser durchspielen. Der Code-Reviewer im AUDIT-Report hat mehrere Fehler gefunden, die nur durch Browser-Test sichtbar wurden (Layout-Brüche, Filter-Counts, Drill-Down-Flows).

## Code-Stil

- **TypeScript strict** — keine `any`, keine `as unknown as`-Hacks. Lieber Wrapper-Typen schreiben.
- **UI-Texte deutsch**, Code-Bezeichner englisch (Ausnahme: deutsche Bank-Begriffe wie `buchungstag`, `verwendungszweck`, `kontogruppe`).
- **Kommentare sparsam** — nur das *Warum*. Was der Code tut, sollte aus den Bezeichnern hervorgehen.
- **Keine Emojis** in Code, UI oder Docs.
- **Datum** intern ISO (`YYYY-MM-DD`), UI `TT.MM.JJJJ`.
- **Currency** über `Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })`.

## Datenschutz im Beitrag

- **Niemals** echte personenbezogene Daten (Namen, IBANs, Verwendungszwecke mit identifizierbarem Inhalt, E-Mails) in Code, Tests, Issues, PRs oder Docs einbauen.
- Beispiel-Daten in Tests müssen synthetisch sein. Siehe vorhandene Tests (`app/src/lib/*.test.ts`) für Muster.
- CSV-Samples für neue Bank-Presets — Anleitung zur Anonymisierung in [`docs/CSV_FORMATS.md`](docs/CSV_FORMATS.md#beitrag-neuer-bank-presets).
- Vor Commit/Push: `git diff` prüfen, ob versehentlich echte Daten drin sind.

## Neues Feature beitragen

1. Issue eröffnen mit dem Use-Case (nicht der Lösung), bevor du Wochen-Arbeit reinsteckst.
2. Roadmap-Prio prüfen ([`ROADMAP.md`](ROADMAP.md)). C-Items und X-Items werden ggf. abgelehnt.
3. Branch von `main`, kleine fokussierte Commits.
4. Bei Architektur-Änderungen: `docs/TECHNICAL.md` und `docs/CHANGELOG.md` mit aktualisieren.
5. PR mit Beschreibung *was* und *warum*, plus Screenshot bei UI-Änderungen.

## Neue Bank unterstützen

Häufigster Beitrag. Workflow:

1. Anonymisiertes CSV-Sample bereitstellen (siehe `docs/CSV_FORMATS.md`).
2. `app/src/lib/field-mapping.ts`: neuen `BankPreset` ans Array anhängen.
3. Falls Header-Metadaten oder kombinierte Felder: `preprocess` / `rowTransform` schreiben — DKB-Preset im selben File als Vorlage.
4. `docs/CSV_FORMATS.md` ergänzen.
5. Unit-Test in `field-mapping.test.ts` mit synthetischem Sample-Block.
6. Mit echtem Sample-CSV im Browser testen, nicht nur via curl.

## Bekannte Bugs

`docs/AUDIT.md` listet verifizierte Bugs. Wenn du an einer dieser Stellen arbeitest, fixe den Bug mit. Nicht ohne Erwähnung darum herum programmieren.

## Was nicht reinkommt

- Server-Auth, User-Verwaltung, Multi-Tenancy — die App ist single-host.
- Cloud-Sync, externe APIs für Konto-Anbindung (regulatorisch & Geist der App).
- Telemetrie, Analytics, externe Schriftarten/CDNs.
- Mehrwährungs-Support, Krypto, NFT-Tracking.
- Große Abhängigkeiten ohne klaren Nutzen — `node_modules` ist auch ohne uns groß genug.

## Fragen?

Issue mit Label `question` aufmachen. Wir sind ein kleines Projekt — keine SLAs, aber Antworten kommen.
