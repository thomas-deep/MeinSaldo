# Design-Brief — MeinSaldo Landing-Page

Brief für eine einseitige, statische Marketing-/Projektseite. Verwendbar als
Vorlage für KI-gestütztes Design (z. B. claude.ai Artifacts) oder als
Umsetzungs-Spec. Die Seite soll die visuelle Identität der App spiegeln.

## Projekt

**MeinSaldo** — ein lokales, offline-first Web-Tool, das Bankkonto- und
Kreditkarten-CSV-Exporte aufbereitet: Mehrkonten-Auswertung, Kategorisierung,
wiederkehrende Zahlungen, Vermögensübersicht. Open Source. Keine Cloud, keine
Telemetrie, alle Daten bleiben auf dem Rechner des Nutzers.

**Kernbotschaft:** „Deine Finanzen, ausgewertet — und deine Daten bleiben
bei dir."

## Zweck der Seite

- Projekt-Vorstellung für den Open-Source-Launch
- Wird statisch über GitHub Pages aus demselben Repo gehostet
- Ein Screen, scrollbar; kein Build-Schritt, kein Framework nötig
- Kein externer Tracker, kein CDN-Zwang — im Geist der App

## Visuelle Identität

Die App hat ein „Editorial Finance"-Theme: warmer Neutralton statt steriles
Grau, ein tiefes Blau als Marke, gedämpftes Smaragd als Akzent. Die
Landing-Page nutzt die **Dark-Variante** als Hauptlook (wirkt als
Fintech-Produkt am stärksten).

### Farben (Dark — Primärlook)

Farbwerte in oklch (so auch im App-Token-System; moderne Browser unterstützen
es nativ).

| Rolle | oklch | Einsatz |
|---|---|---|
| Hintergrund | `oklch(0.165 0.012 270)` | Seitenhintergrund |
| Fläche (Karten) | `oklch(0.22 0.013 270)` | Cards, Panels |
| Fläche erhöht | `oklch(0.205 0.012 270)` | abgesetzte Blöcke |
| Rahmen | `oklch(0.31 0.012 270)` | Kartenränder, Trennlinien |
| Text | `oklch(0.965 0.005 75)` | Überschriften, Fließtext |
| Text gedämpft | `oklch(0.72 0.012 270)` | Sekundärtext |
| Text schwach | `oklch(0.42 0.014 270)` | Labels, Captions |
| Marke (Blau) | `oklch(0.65 0.15 240)` | primäre Buttons, Links, Akzente |
| Akzent (Smaragd) | `oklch(0.58 0.12 165)` | sekundäre Hervorhebung |
| Positiv (Grün) | `oklch(0.6 0.14 155)` | Einnahmen, Erfolg |
| Danger (Oxblood) | `oklch(0.52 0.18 28)` | Ausgaben, Warnung |
| Warn (Amber) | `oklch(0.7 0.15 75)` | Hinweise |

### Fonts (alle Google Fonts, frei)

- **Geist Sans** — UI, Fließtext, Buttons. Sachlich, modern.
- **Geist Mono** — Zahlen, Beträge, Code-Snippets (z. B. Install-Befehle).
- **Instrument Serif** — Display-/Editorial-Überschriften, gern *kursiv* als
  Akzent (genau wie der App-Header: kursives „Mein" + reguläres „Saldo").
  Nur Weight 400, normal + italic.

### Stil-Prinzipien

- Großzügiger Weißraum, ruhige Komposition — kein Marketing-Lärm.
- Ecken: `border-radius` ~16px für Karten (entspricht `rounded-2xl`).
- Zahlen immer im DE-Format (`1.234,56 €`), `tabular-nums`.
- Dezente Schatten, kein Neon, keine Verläufe-Orgien. Ein einzelner,
  zurückhaltender Akzent-Verlauf im Hero ist okay.
- Sprache: durchgehend Deutsch, sachlich, vertrauensbildend.

## Seitenaufbau (Abschnitte von oben nach unten)

1. **Hero** — Wortmarke „MeinSaldo" (Instrument Serif, kursives „Mein"),
   ein Satz Subline, zwei Buttons: „Auf GitHub ansehen" (primär) und
   „Wie es funktioniert" (Anker nach unten). Optional ein App-Screenshot
   (Dark-Mode-Dashboard) leicht angeschnitten/perspektivisch.
2. **Das Problem / die Idee** — kurzer Dreizeiler: CSV-Exporte sind roh und
   verstreut; MeinSaldo macht daraus eine Auswertung — lokal.
3. **Feature-Highlights** — 4–6 Karten mit Icon, Titel, 1–2 Sätzen:
   Mehrkonten-Import · regelbasierte + KI-Kategorisierung · wiederkehrende
   Zahlungen mit Preisänderungs-Alert · Vermögensübersicht · Volltextsuche
   · Umbuchungs-Erkennung.
4. **Screenshots** — 2–3 Bilder (Auswertung, Wiederkehrend, Vermögen).
   **Wichtig: ausschließlich aus einer synthetischen Demo-Datenbank** —
   nie echte Finanzdaten.
5. **Datenschutz / Local-first** — eigener Block, der klarmacht: keine Cloud,
   keine Telemetrie, eine SQLite-Datei lokal, optionale KI über lokales
   Ollama. Das ist ein Verkaufsargument, kein Kleingedrucktes.
6. **Schnellstart** — `git clone …`, `cd app`, `npm install`, `npm run dev`
   in einem Mono-Code-Block.
7. **Mitmachen** — Verweis auf `CONTRIBUTING.md` und besonders die
   willkommenen anonymisierten Bank-CSV-Beiträge.
8. **Footer** — Lizenz, GitHub-Link, „Built with …", dezent.

## Technische Vorgaben

- Eine `index.html` plus optional `style.css` und ein Bilder-Ordner.
- Kein JS-Framework; minimal vanilla JS höchstens für Smooth-Scroll/Theme.
- Responsive: Mobil einspaltig, ab ~768px mehrspaltige Feature-/Screenshot-
  Raster.
- Fonts via Google-Fonts-`<link>` ODER lokal mitgeliefert (lokal ist
  konsistenter mit dem Offline-Geist — Abwägung dem Umsetzer überlassen).
- Light-Mode optional; Dark ist Pflicht und Primärlook.
- Assets relativ verlinken (Pages serviert unter Unterpfad `/MeinSaldo/`).

## Was vermeiden

- Keine Stockfotos, keine generischen Hero-Illustrationen.
- Keine erfundenen Zahlen-Claims („spare X %").
- Keine echten Namen, IBANs, Kontostände — auch nicht in Screenshots.
- Kein Cookie-Banner / Analytics — es gibt nichts zu tracken.
