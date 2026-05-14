# Technische Dokumentation

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (React)                         │
│  page.tsx (Daten | Einstellungen)                            │
│  ├─ CsvUpload, FieldMapping                                  │
│  ├─ KontogruppeFilter, SummaryCards                          │
│  ├─ MonthlyChart, CategoryChart, CategoryDrillDown           │
│  ├─ TransactionTable                                         │
│  └─ SettingsView (Kontogruppen, Kategorien, KI, Daten)       │
└─────────────────────┬───────────────────────────────────────┘
                      │ fetch
┌─────────────────────▼───────────────────────────────────────┐
│              Next.js API-Routes (Server)                     │
│  /api/transactions    GET/POST/DELETE  (Liste, Import, Reset)│
│  /api/transactions/[id] PATCH         (Kategorie/Umbuchung)  │
│  /api/kontogruppen    GET/POST                               │
│  /api/kontogruppen/[id] PATCH/DELETE                         │
│  /api/settings        GET/PUT                                │
│  /api/ai/models       GET            (Proxy auf Ollama)      │
│  /api/ai/categorize   GET/POST       (KI-Klassifikation)     │
└─────────────────────┬───────────────────────────────────────┘
                      │
       ┌──────────────┴───────────────┐
       ▼                              ▼
  ┌─────────────┐              ┌──────────────┐
  │  SQLite     │              │  Ollama      │
  │  (lokal)    │              │  (optional)  │
  │  WAL-mode   │              │  localhost   │
  └─────────────┘              └──────────────┘
```

Alles läuft single-host, single-process. Keine externen Services nötig (außer optional Ollama).

## Verzeichnis-Layout

```
app/
├── src/
│   ├── app/                       Next.js App Router
│   │   ├── layout.tsx             Root-Layout mit Fira-Fonts
│   │   ├── globals.css            Dark-Theme Tailwind
│   │   ├── page.tsx               Hauptseite (View-Switch)
│   │   └── api/                   Server-Routes
│   │       ├── transactions/
│   │       ├── kontogruppen/
│   │       ├── settings/
│   │       └── ai/
│   ├── components/                React-Komponenten
│   │   ├── CsvUpload.tsx
│   │   ├── FieldMapping.tsx
│   │   ├── KontogruppenManager.tsx
│   │   ├── KontogruppeFilter.tsx
│   │   ├── SummaryCards.tsx
│   │   ├── MonthlyChart.tsx
│   │   ├── CategoryChart.tsx
│   │   ├── CategoryDrillDown.tsx
│   │   ├── TransactionTable.tsx
│   │   ├── DbStatus.tsx
│   │   ├── SettingsView.tsx
│   │   ├── CategoriesView.tsx
│   │   ├── AiSettings.tsx
│   │   └── AiCategorizeButton.tsx
│   └── lib/                       Logik & Utilities
│       ├── types.ts               Domain-Types
│       ├── db.ts                  SQLite-Zugriff + Migrationen
│       ├── parse-csv.ts           CSV-Parser + Date/Number-Heuristik
│       ├── field-mapping.ts       Bank-Presets + Preprocess-Hooks
│       ├── categories.ts          Klassifikations-Regeln
│       ├── icons.ts               Lucide-Icon-Map für Kontogruppen
│       └── ollama.ts              LLM-Client + Prompt-Building
├── data/                          Persistente DB (gitignored)
│   └── finanzen.db
└── package.json
```

## Datenmodell

### `transactions`
| Spalte | Typ | Notiz |
|---|---|---|
| `id` | TEXT PK | sha256(date+amount+iban+name+verwendungszweck+saldo+kontogruppe_id), erste 16 Hex-Zeichen |
| `konto_bezeichnung` | TEXT | Aus CSV |
| `iban_konto` | TEXT | Eigene IBAN |
| `buchungstag` | TEXT | ISO `YYYY-MM-DD` |
| `valutadatum` | TEXT | ISO `YYYY-MM-DD` |
| `name_zahlungsbeteiligter` | TEXT | Counterparty |
| `iban_zahlungsbeteiligter` | TEXT | Counterparty-IBAN |
| `buchungstext` | TEXT | Bank-Texttyp / Vorgang |
| `verwendungszweck` | TEXT | Hauptbeschreibung |
| `betrag` | REAL | Negativ = Ausgabe |
| `waehrung` | TEXT | meist EUR |
| `saldo_nach_buchung` | REAL | Aus CSV (optional) |
| `kategorie` | TEXT | Aus Regel- oder KI-Logik, ggf. manuell überschrieben |
| `is_manual_override` | INTEGER | 1 = User hat Kategorie manuell gesetzt |
| `umbuchung_override` | INTEGER | NULL = Auto, 0 = forciert nein, 1 = forciert ja |
| `kontogruppe_id` | INTEGER FK | Optional, NULL = nicht zugeordnet |
| `imported_at` | TEXT | ISO-Timestamp |

Indizes: `idx_buchungstag`, `idx_kategorie`.

### `kontogruppen`
| Spalte | Typ |
|---|---|
| `id` | INTEGER PK AUTOINCREMENT |
| `name` | TEXT UNIQUE |
| `type` | TEXT (`privat`/`gemeinsam`/`firma`/`kreditkarte`) |
| `color` | TEXT (Hex) |
| `icon` | TEXT (Key aus `icons.ts`) |
| `bank` | TEXT (BankPreset.name) |
| `created_at` | TEXT |

### `settings`
| Spalte | Typ |
|---|---|
| `key` | TEXT PK |
| `value` | TEXT |

Aktuelle Keys: `ollama_enabled`, `ollama_url`, `ollama_model`.

### Migrationen
Bei jedem `getDb()`-Aufruf laufen die `CREATE TABLE IF NOT EXISTS` + `ensureColumn`-Helper. Neue Spalten werden via `PRAGMA table_info` geprüft und bei Bedarf via `ALTER TABLE` ergänzt — keine separate Migrations-Tooling-Schicht.

## CSV-Parser-Pipeline

```
rawText (CSV-Inhalt)
   │
   │ preset.preprocess(rawText)?   (Bank-spezifisch)
   ▼
{csvText, defaultFields}
   │
   │ Papa.parse(csvText, {delimiter, header:true})
   ▼
RawRow[]
   │
   │ {...defaultFields, ...row}   für jede Zeile
   ▼
RawRow[] (angereichert)
   │
   │ preset.rowTransform(row)?    (Bank-spezifisch)
   ▼
RawRow[] (mit synthetischen Feldern wie _Counterparty, _Name, _Iban, _Purpose)
   │
   │ mapping anwenden, Beträge/Datum parsen, invertAmount, kategorisieren
   ▼
Transaction[]
```

### Preset-Hooks

```typescript
interface BankPreset {
  name: string;
  mapping: FieldMapping;          // Spalten-Zuordnung
  separator: string;
  encoding: string;
  invertAmount?: boolean;         // Vorzeichen umkehren (z.B. AmEx)
  defaultCurrency?: string;
  preprocess?: (rawText) => {     // Header-Zeilen entfernen, Metadaten extrahieren
    csvText: string;
    defaultFields?: Record<string, string>;
  };
  rowTransform?: (row) => row;    // Synthetische Felder berechnen
}
```

Konkrete Beispiele:
- **DKB**: `preprocess` sucht echte Header-Zeile, extrahiert eigene IBAN aus Metadaten; `rowTransform` wählt `_Counterparty` aus `Zahlungspflichtige*r` oder `Zahlungsempfänger*in` basierend auf Selbst-Tokens (`DKB AG`, `ISSUER`)
- **comdirect**: `preprocess` überspringt Metadaten; `rowTransform` extrahiert via Regex `_Name`, `_Iban`, `_Purpose` aus dem konkatenierten `Buchungstext`-Feld
- **American Express**: keine Hooks nötig, nur Standard-Mapping + `invertAmount: true` + Komma-Separator

### Zahl-Parser-Heuristik (`parseGermanNumber`)
- `1.234,56` → 1234.56 (deutsch mit Tausender)
- `1234,56` → 1234.56 (deutsch ohne Tausender)
- `9.99` → 9.99 (US-Format, 1-2 Nachkommastellen)
- `1.234.567` → 1234567 (mehrere Punkte ohne Komma → Tausender)

### Datum-Parser-Heuristik (`parseGermanDate`)
- `30.12.2025` → `2025-12-30`
- `30.12.25` → `2025-12-30` (2-stelliges Jahr, < 70 = 20xx)
- `05/01/2025` → `2025-01-05`
- `2025-12-30` → unverändert

## Dedup-Logik

Beim Import wird pro Buchung ein 16-Hex-Hash gebildet aus:
```
buchungstag | valutadatum | betrag.toFixed(2) | iban_zahlungsbeteiligter
| name_zahlungsbeteiligter | verwendungszweck | saldo_nach_buchung.toFixed(2)
| kontogruppe_id
```
Existiert dieser Hash bereits, wird die Buchung als Duplikat verworfen (`INSERT OR IGNORE`).

Folge: Re-Import desselben CSV-Auszugs hat keinen Effekt. Re-Import mit anderer Kontogruppe würde Duplikate erzeugen — bewusst, da gleiche Transaktion in anderer Konto-Zuordnung sinnvoll sein kann.

## Kategorisierungs-Engine

### Regel-basiert (`lib/categories.ts`)
- 23 Kategorien × Liste von `keywords` (Volltext-Match in `verwendungszweck + name + buchungstext`) und `namePatterns` (Match in `name`)
- Reihenfolge der `categoryRules` ist relevant — erste Regel gewinnt
- Fallback: `Sonstige Einnahmen` (bei Betrag > 0) oder `Sonstiges`

### KI-Override (`lib/ollama.ts`)
- Prompt enthält allowed-categories-Liste + Buchungsdetails
- `temperature: 0`, `num_predict: 32` für deterministische, kurze Antworten
- Antwort wird via `matchCategory` fuzzy gegen die erlaubte Liste gematcht (exact → startsWith → contains → inverse)
- Treffer wird in DB mit `is_manual_override = 1` gesetzt (überschreibt Regel-Logik bei Re-Imports)

### Manuelle Korrektur
- User-Edit in TransactionTable → `PATCH /api/transactions/[id]` mit `{ kategorie }` → `is_manual_override = 1`

## Umbuchungs-Erkennung

Berechnet **zur Lese-Zeit** in `rowToTransaction`:

```typescript
if (umbuchung_override !== null) return umbuchung_override === 1;
const ibanMatch = ownIbans.has(counterIban);
const cardSettlement = hasKreditkarteGroup && CREDIT_CARD_PATTERNS.some(p =>
  name.toLowerCase().includes(p)
);
return ibanMatch || cardSettlement;
```

- `ownIbans` = alle distinkten `iban_konto` aus der DB
- `hasKreditkarteGroup` = mindestens eine Kontogruppe mit Typ `kreditkarte`
- `CREDIT_CARD_PATTERNS`: `american express`, `amex`, `visa europe`, `visa card`, `mastercard`, `master card`, `diners club`, `diners international`
- Manueller Toggle: `PATCH /api/transactions/[id]` mit `{ umbuchung: true/false }` → setzt `umbuchung_override`

## API-Referenz

### Transactions

**`GET /api/transactions`**
```json
{
  "transactions": [Transaction[]],
  "stats": { "count": 42, "earliest": "2025-01-02", "latest": "2025-12-30" }
}
```

**`POST /api/transactions`**
```json
{ "transactions": [Transaction[]], "kontogruppeId": 5 }
```
Liefert `{ inserted, skipped, total }`. Schreibt mit Dedup-Hash.

**`DELETE /api/transactions`** → löscht alle.

**`PATCH /api/transactions/[id]`**
```json
{ "kategorie": "Lebensmittel" }
// oder
{ "umbuchung": true | false | null }
```

### Kontogruppen

**`GET /api/kontogruppen`** → `{ kontogruppen: Kontogruppe[] }`

**`POST /api/kontogruppen`**
```json
{ "name": "Privat", "type": "privat", "color": "#3B82F6",
  "icon": "user", "bank": "DKB (neuer Export)" }
```

**`PATCH /api/kontogruppen/[id]`** — gleiche Felder wie POST
**`DELETE /api/kontogruppen/[id]`** — Transaktionen werden entkoppelt (kontogruppe_id → NULL)

### Settings & KI

**`GET /api/settings`** → `{ ollamaEnabled, ollamaUrl, ollamaModel }`
**`PUT /api/settings`** — gleiche Felder

**`GET /api/ai/models?url=...`** → `{ models: [{name, size}] }` (proxiert auf Ollama)

**`GET /api/ai/categorize`** → `{ ids: string[], count: number }` (alle Sonstiges-IDs ohne Override)

**`POST /api/ai/categorize`**
```json
{ "ids": ["abc123", "def456"] }
```
Liefert `{ results: [{ id, kategorie | null, error? }] }`. Schreibt erfolgreiche Treffer direkt in DB mit `is_manual_override = 1`.

## Erweiterungspunkte

### Neue Bank hinzufügen
1. `src/lib/field-mapping.ts` — neuen `BankPreset` ans Array anhängen
2. Bei Header-Zeilen: `preprocess`-Funktion schreiben
3. Bei kombinierten Feldern: `rowTransform`-Funktion mit Regex
4. Field-Mapping testen: CSV im Browser hochladen → Mapping-Panel öffnen → Preset wählen → „Neu importieren"

### Neue Kategorie hinzufügen
1. `src/lib/categories.ts` — neuen Eintrag in `categoryRules`
2. Reihenfolge beachten — spezifischere Regeln nach oben
3. Build oder HMR reicht; bestehende Daten werden bei nächstem Import neu kategorisiert (für bereits importierte Daten manuell re-run via „Mit aktuellem Mapping neu importieren")

### Neues Icon für Kontogruppe
1. `src/lib/icons.ts` — Import + Eintrag in `ICON_MAP`

### Anderen LLM-Provider
1. `src/lib/ollama.ts` als Vorlage nehmen, neuen Client schreiben (gleiche Funktionssignatur)
2. `/api/ai/categorize/route.ts` anpassen, um den neuen Client zu nutzen
3. Settings entsprechend erweitern

## Build & Test

```bash
npm run dev      # Dev-Server mit Turbopack auf :3000
npm run build    # Production-Build
npm start        # Production-Server
npx tsc --noEmit # TypeScript-Check
npx eslint .     # Lint
```

Es gibt aktuell keine automatisierten Tests — Verifikation erfolgt manuell im Browser (Drag & Drop, Buttons, Filter).

## Bekannte Einschränkungen

- **Single-User**: keine Auth, keine Multi-Tenant-Trennung
- **Single-Process**: SQLite-WAL erlaubt mehrere Reader, aber nur ein Writer (kein Problem in der aktuellen Nutzung)
- **CSV-Encoding**: aktuell UTF-8 only — Windows-1252-CSVs müssten extern konvertiert werden
- **Keine Backups**: SQLite-Datei manuell sichern, falls wichtig
- **Ollama-Sequential**: Klassifikation läuft sequentiell in Batches von 3, kein paralleles Inferencing
