# Technische Dokumentation

Stand: **v0.2.0**.

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (React 19)                      │
│  page.tsx (Auswertung · Wiederkehrend · Vermögen ·           │
│            Daten · Einstellungen) + globale Such-Palette ⌘K  │
│  ├─ Auswertung: AuswertungFilter, SummaryCards,              │
│  │              MonthlyChart, CategoryChart, DrillDown,      │
│  │              KontogruppeFilter (hierarchisch)             │
│  ├─ TransactionTable mit Multiselect + Bulk + TagPicker      │
│  ├─ Wiederkehrend: RecurringView                             │
│  ├─ Vermögen: NetWorthView                                   │
│  ├─ Daten: CsvUpload, FieldMapping, CsvImportPreview,        │
│  │         ImportHistory, DbStatus                           │
│  └─ Einstellungen: InhaberManager, KontogruppenManager,      │
│              CategoriesView, TagManager, AiSettings,          │
│              DatabaseBackup, LogsView                         │
└─────────────────────┬───────────────────────────────────────┘
                      │ fetch (mit Origin-Check via Middleware)
┌─────────────────────▼───────────────────────────────────────┐
│              Next.js API-Routes (Server)                     │
│  /api/import           POST     (multipart, dryRun-Flag)     │
│  /api/imports          GET/PATCH/DELETE  (Import-Historie)   │
│  /api/transactions     GET/DELETE                            │
│  /api/transactions/[id]   PATCH                              │
│  /api/transactions/[id]/tags  PUT                            │
│  /api/transactions-bulk   PATCH/DELETE                       │
│  /api/inhaber(/[id])   GET/POST · PATCH/DELETE               │
│  /api/kontogruppen(/[id])  GET/POST · PATCH/DELETE           │
│  /api/kontogruppen/[id]/anchor  PUT/DELETE  (Konto-Anker)    │
│  /api/kategorien(/[id])   GET/POST · PATCH/DELETE            │
│  /api/search           GET (FTS5-Volltextsuche)             │
│  /api/recurring        GET (wiederkehrende Zahlungen)        │
│  /api/tags(/[id])      GET/POST · PATCH/DELETE               │
│  /api/networth         GET (Vermögens-Gesamtbild)           │
│  /api/assets(/[id])    GET/POST · DELETE  (+/snapshots POST) │
│  /api/liabilities(/[id])  GET/POST · DELETE (+/snapshots)    │
│  /api/settings         GET/PUT                               │
│  /api/backups(/[name](/restore))  GET/POST · GET/DELETE · POST│
│  /api/backup-download  POST   /api/backup-restore-upload POST │
│  /api/logs             GET/DELETE                            │
│  /api/ai/models        GET (Proxy auf Ollama)                │
│  /api/ai/categorize    GET/POST   (mit Concurrency-Lock)     │
└─────────────────────┬───────────────────────────────────────┘
                      │
       ┌──────────────┴───────────────┐
       ▼                              ▼
  ┌─────────────┐              ┌──────────────┐
  │  SQLite     │              │  Ollama      │
  │  WAL + FTS5 │              │  (optional)  │
  │  app/data/  │              │  localhost   │
  └─────────────┘              └──────────────┘
```

Alles läuft single-host, single-process. Keine externen Services nötig.

## Verzeichnis-Layout

```
app/
├── src/
│   ├── app/                       Next.js App Router
│   │   ├── layout.tsx             Root-Layout (Geist, Geist Mono, Instrument Serif)
│   │   ├── globals.css            Token-System (oklch, Light + Dark)
│   │   ├── page.tsx               Hauptseite (5 Views + Such-Palette)
│   │   └── api/                   Server-Routes
│   │       ├── import/            POST multipart, dryRun-Flag
│   │       ├── imports/           Import-Historie (GET/PATCH/DELETE)
│   │       ├── transactions/      List + single + bulk + [id]/tags
│   │       ├── inhaber/           Inhaber-CRUD
│   │       ├── kontogruppen/      Konten-CRUD
│   │       ├── kategorien/        Kategorien-CRUD mit Regel-Editor
│   │       ├── search/            FTS5-Volltextsuche
│   │       ├── recurring/         Wiederkehrende Zahlungen
│   │       ├── tags/              Tag-CRUD
│   │       ├── networth/          Vermögens-Gesamtbild
│   │       ├── assets/            Vermögensposten + snapshots
│   │       ├── liabilities/       Verbindlichkeiten + snapshots
│   │       ├── settings/          KV-Store
│   │       ├── logs/              Audit-Trail
│   │       └── ai/                Ollama-Proxy + Klassifikation
│   ├── components/                React-Komponenten
│   │   ├── mobile/                Smartphone-Shell (siehe „Mobile-Ansicht")
│   │   │   ├── MobileApp.tsx      Bottom-Tab-Shell + Sheet-Host
│   │   │   ├── MobileDashboard.tsx        Hero-Saldo, Cashflow, Kategorien
│   │   │   ├── MobileTransactionList.tsx  Suche, Tages-Gruppen, Paging
│   │   │   ├── MobileTransactionSheet.tsx Detail-Sheet + Kategorie-Wechsel
│   │   │   ├── MobileNetWorth.tsx         Vermögen read-only + Sparkline
│   │   │   └── MobileRecurring.tsx        Abos read-only + Fixkosten/Monat
│   │   ├── ThemeProvider.tsx      System/Light/Dark mit Persistenz
│   │   ├── ThemeToggle.tsx        3-State Pill im Header
│   │   ├── SearchPalette.tsx      ⌘K-Volltextsuche-Modal
│   │   ├── AuswertungFilter.tsx   Collapsable mit Zeitraum + Direction + …
│   │   ├── SummaryCards.tsx       Hero-Zahlen + Vorjahresvergleich
│   │   ├── MonthlyChart.tsx       theme-aware, klickbare Bars
│   │   ├── CategoryChart.tsx      Bar/Donut, Mini-Cluster, oklch-Palette
│   │   ├── CategoryDrillDown.tsx  klickbare Breadcrumbs
│   │   ├── TransactionTable.tsx   Multiselect + Bulk-Bar + TagPicker
│   │   ├── RecurringView.tsx      Wiederkehrende Zahlungen + Preis-Alert
│   │   ├── NetWorthView.tsx       Vermögen, Verlaufs-Chart, Posten-Listen
│   │   ├── KontogruppeFilter.tsx  hierarchisch (Inhaber → Konten)
│   │   ├── KontogruppenManager.tsx gruppiert nach Inhaber
│   │   ├── InhaberManager.tsx     CRUD für Inhaber
│   │   ├── CategoriesView.tsx     Regel-Editor
│   │   ├── TagManager.tsx         Tag-CRUD mit Farbpalette
│   │   ├── TagPicker.tsx          Inline-Popover zum Tag-Zuweisen
│   │   ├── ImportHistory.tsx      Batch-Konto-Wechsel/Delete
│   │   ├── CsvImportPreview.tsx   Vorschau mit 3 Import-Buttons
│   │   ├── CsvUpload.tsx          Dropzone + Settings-Bar
│   │   ├── FieldMapping.tsx       Mapping mit Re-Parse-Button
│   │   ├── DbStatus.tsx           Counts + Zeitraum + DB leeren
│   │   ├── LogsView.tsx           Audit-Trail mit Event-Filter
│   │   ├── AiSettings.tsx         Ollama URL + Modell + Test
│   │   ├── ConfirmDialog.tsx      Wiederverwendbarer Bestätigungs-Dialog
│   │   └── Toggle.tsx             Shared Toggle-Slider
│   ├── lib/                       Reine Logik & Utilities
│   │   ├── types.ts               Domain-Typen
│   │   ├── db.ts                  SQLite-Zugriff + Migrationen
│   │   ├── parse-csv.ts           CSV-Parser, Date-/Number-Heuristik
│   │   ├── field-mapping.ts       Bank-Presets + Preprocess-Hooks
│   │   ├── categories.ts          Default-Regeln (Seed)
│   │   ├── umbuchung-detection.ts Paar-Matching (pure, getestet)
│   │   ├── recurring.ts           Recurring-Detection (pure, getestet)
│   │   ├── networth.ts            Net-Worth-History + balanceAsOf (pure)
│   │   ├── category-history.ts    Kategorie-Übernahme aus Verlauf (pure)
│   │   ├── number-format.ts       DE-Zahlen parsen/formatieren (pure)
│   │   ├── date-range.ts          Zeitraum-Presets (pure, getestet)
│   │   ├── api-validation.ts      Zod-Schemas + parseBody-Helper
│   │   ├── test-helpers.ts        In-Memory-DB-Setup für Tests
│   │   ├── use-ai-categorize.ts   Client-Hook + Runner
│   │   ├── use-is-mobile.ts       Viewport-Switch (< 768px) via matchMedia
│   │   ├── mobile-format.ts       Format-Helfer der Mobile-Ansicht (pure)
│   │   ├── chart-theme.ts         CSS-Var-Lesen für Recharts
│   │   ├── icons.ts               Lucide-Icon-Map für Kontogruppen
│   │   └── ollama.ts              LLM-Client + Prompt-Building
│   └── middleware.ts              CSRF-Origin-Check
├── data/                          Persistente DB (gitignored)
│   └── finanzen.db                SQLite
├── .env.example                   Beispiel für Origins/Hosts
└── package.json
```

## Datenmodell

Schema in einer einzigen `v1`-Migration (`migrations[]` in `lib/db.ts`).
Zukünftige Schema-Änderungen kommen als zusätzliche Migrationen ans Ende.

### `inhaber`
| Spalte | Typ | Notiz |
|---|---|---|
| `id` | INTEGER PK | autoincrement |
| `name` | TEXT UNIQUE | „Privat", „Gemeinsam", … |
| `type` | TEXT | `privat` / `gemeinsam` / `firma` |
| `color` | TEXT | Hex |
| `created_at` | TEXT | ISO |

### `kontogruppen`
| Spalte | Typ | Notiz |
|---|---|---|
| `id` | INTEGER PK | |
| `name` | TEXT | Pro Inhaber unique (`UNIQUE(inhaber_id, name)`) |
| `inhaber_id` | INTEGER FK | NOT NULL, `ON DELETE RESTRICT` |
| `art` | TEXT | `girokonto` / `sparkonto` / `kreditkarte` / `depot` / `sonstiges` |
| `color` | TEXT | Hex |
| `icon` | TEXT | Key aus `lib/icons.ts` |
| `bank` | TEXT NULL | optionaler Preset-Name aus `field-mapping.ts` |
| `created_at` | TEXT | |

### `kategorien`
| Spalte | Typ |
|---|---|
| `id` | INTEGER PK |
| `name` | TEXT UNIQUE |
| `rule_order` | INTEGER | Reihenfolge im Matcher |
| `keywords` | TEXT (JSON-Array) | Volltext-Match |
| `name_patterns` | TEXT (JSON-Array) | Match in Counterparty/Empfänger |

Beim Boot werden Default-Regeln aus `lib/categories.ts` via `INSERT OR IGNORE` seedlich
nachgezogen — bestehende Regeln werden nie überschrieben. Fallback-Einträge
(`Sonstige Einnahmen`, `Sonstiges`) sind im UI gesperrt.

### `transactions`
| Spalte | Typ | Notiz |
|---|---|---|
| `id` | TEXT PK | sha256 über `buchungstag + valutadatum + betrag + iban_counter + name + zweck + iban_konto + saldo`, 16 Hex-Zeichen. **Ohne** `kontogruppe_id` → Re-Import mit anderer Zuordnung erzeugt keinen Duplikat |
| `konto_bezeichnung` / `iban_konto` | TEXT | aus CSV |
| `buchungstag` / `valutadatum` | TEXT | ISO `YYYY-MM-DD` |
| `name_zahlungsbeteiligter` / `iban_zahlungsbeteiligter` | TEXT | Counterparty |
| `buchungstext` / `verwendungszweck` | TEXT | |
| `betrag` | REAL | negativ = Ausgabe |
| `waehrung` | TEXT | meist `EUR` |
| `saldo_nach_buchung` | REAL | |
| `kategorie_id` | INTEGER FK | → `kategorien` |
| `kontogruppe_id` | INTEGER FK | nullable |
| `is_manual_override` | INTEGER | `1` wenn User Kategorie geändert |
| `ai_classified` | INTEGER | `1` wenn AI klassifiziert |
| `is_umbuchung` | INTEGER | materialisiert (vom Erkenner gesetzt) |
| `umbuchung_override` | INTEGER NULL | `NULL` = computed, `0`/`1` = forciert |
| `imported_at` | TEXT | ISO — Buchungen eines Imports tragen denselben Wert (Batch-Key) |

Indizes auf `buchungstag`, `kategorie_id`, `kontogruppe_id`, `betrag`.

### `settings`, `logs`, `schema_migrations`
| Tabelle | Zweck |
|---|---|
| `settings` (key/value) | Aktuelle Keys: `ollama_enabled`, `ollama_url`, `ollama_model` |
| `logs` (id, created_at, level, event, message, details JSON) | Audit-Trail, indiziert auf `created_at` + `event`, Auto-Trim bei >5000 Einträgen |
| `schema_migrations` (version, applied_at) | Verfolgung angewendeter Migrationen |

### `transactions_fts` (Migration v5)

FTS5-Virtual-Table als Volltextindex über `verwendungszweck`,
`name_zahlungsbeteiligter`, `buchungstext`. `content='transactions'`,
`content_rowid='rowid'`, Tokenizer `unicode61 remove_diacritics 2` (macht
Umlaute suchbar). Sync via drei Trigger (`_ai_fts`, `_ad_fts`, `_au_fts`)
auf INSERT/UPDATE/DELETE der `transactions`-Tabelle. Anfragen werden über
`buildFtsQuery` sanitisiert (Sonderzeichen entfernt, Prefix-Suche pro Token).

### `tags` & `transaction_tags` (Migration v6)

Many-to-Many zwischen Tags (`name UNIQUE`, `color`) und Transaktionen mit
Cascade-Delete in beide Richtungen. Tags sind frei vergebbare Labels quer
zu Kategorien (z. B. `urlaub-2025`). API-Zuweisung pro Transaktion über
`PUT /api/transactions/[id]/tags { tagIds }` (Set-Semantik: ersetzt
komplett, nicht inkrementell).

### Net-Worth (Migration v7)

- `assets (id, name, kind, note, created_at)` — manuell gepflegte Vermögens-
  posten (Depot, Immobilie, Bargeld, sonstiges)
- `liabilities (id, name, kind, note, created_at)` — Kredite und Hypotheken
- `asset_snapshots (asset_id, date, value, quantity, unit_price)` /
  `liability_snapshots (liability_id, date, value)` — Werteverläufe mit
  `UNIQUE(entity, date)` für Upsert-Semantik. `quantity`/`unit_price`
  (Migration v12, nullable) halten bei Asset-Snapshots optional die
  Aufschlüsselung Menge × Preis (z. B. Gold in oz × Kurs); ein
  Plain-Value-Upsert am selben Datum setzt beide zurück auf NULL.

**Wichtig**: Kontogruppen-Salden (letzter `saldoNachBuchung` pro
`kontogruppe_id`) zählen **zusätzlich** automatisch — Giro/Spar/Bargeld
als Asset, Kreditkarte als Liability (`Math.abs`). Diese Werte stehen in
den `transactions`-Daten und werden nicht in `assets`/`liabilities`
dupliziert. Implementierung: `getKontogruppenAsEntries()` und
`getKontogruppenMonthlySnapshots()` in `lib/db.ts`, History-Aggregation
über pure `buildMonthlyNetWorthHistory()` aus `lib/networth.ts`
(Forward-Fill je Entity).

### Konto-Anker (Migration v8)

`kontogruppen.anchor_date` / `anchor_value` — optionaler bekannter
Kontostand zu einem Stichtag. Ist er gesetzt, rekonstruiert
`balanceAsOf()` (pure, in `lib/networth.ts`) den Saldo-Verlauf aus Anker
plus kumulierten Buchungsbeträgen — rück- und vorwärts. So bekommen auch
Konten ohne brauchbaren CSV-Saldo einen korrekten Net-Worth-Verlauf.
Eingabe über `PUT/DELETE /api/kontogruppen/[id]/anchor`.

### FTS5-Index als reguläre Tabelle (Migration v9)

`transactions_fts` war ursprünglich (v5) eine external-content-FTS5-
Tabelle. Deren `'delete'`-Trigger verlangen exakt übereinstimmende
Alt-Werte; jede Desynchronisation führt zu `SQLITE_CORRUPT_VTAB` und
lässt danach **jedes** `UPDATE` auf `transactions` fehlschlagen. v9 baut
`transactions_fts` als reguläre FTS5-Tabelle neu auf — die Trigger nutzen
einfaches `DELETE … WHERE rowid = …` ohne die fragile Anforderung.

## CSV-Parser-Pipeline

```
multipart/form-data POST → /api/import
   │
   │ TextDecoder(encoding) — encoding ist 'auto' | 'utf-8' | 'windows-1252'
   ▼
csvText
   │
   │ preset.preprocess(csvText)?   (Bank-spezifisch)
   ▼
{cleanedText, defaultFields}
   │
   │ Papa.parse(cleanedText, {delimiter, header:true})
   ▼
RawRow[]
   │
   │ {...defaultFields, ...row}   für jede Zeile
   │ preset.rowTransform(row)?    (Bank-spezifisch)
   ▼
RawRow[] (mit synthetischen Feldern wie _Counterparty, _Name, _Iban, _Purpose)
   │
   │ mapping anwenden, Beträge/Datum parsen, invertAmount,
   │ categorizeTransaction(tx, rulesFromDb)
   ▼
Transaction[]
   │
   │ insertTransactions(tx, kontogruppeId)
   │   → Dedup-Hash check
   │   → Kategorie via kategorie_id-Lookup (mit Cache)
   │   → existingHashes() für dryRun-Preview
   │   → recomputeUmbuchungen() am Ende
   ▼
{ inserted, skipped, total, insertedIds }
```

### Preset-Hooks

```typescript
interface BankPreset {
  name: string;
  mapping: FieldMapping;
  separator: string;
  encoding: string;                // wird bei 'auto' clientseitig gezogen
  invertAmount?: boolean;          // Vorzeichen kippen (AmEx)
  defaultCurrency?: string;
  preprocess?: (rawText) => { csvText, defaultFields? };
  rowTransform?: (row) => row;
}
```

Konkrete Beispiele:
- **DKB (neuer Export)**: `preprocess` sucht die echte Header-Zeile beliebig
  tief, extrahiert die eigene IBAN; `rowTransform` wählt `_Counterparty` aus
  `Zahlungspflichtige*r` oder `Zahlungsempfänger*in`
- **comdirect**: `preprocess` überspringt Metadaten; `rowTransform` extrahiert
  `_Name` / `_Iban` / `_Purpose` per Regex aus dem Buchungstext
- **Sparkasse**: `encoding: 'windows-1252'` (für `auto`-Modus)
- **American Express**: `invertAmount: true`, Komma-Separator

### Parser-Heuristiken

`parseGermanNumber`:
- `1.234,56` → 1234.56 (deutsch mit Tausender)
- `1234,56` → 1234.56 (deutsch ohne Tausender)
- `9.99` → 9.99 (US-Format, 1–2 Nachkommastellen)
- `1.234.567` → 1234567 (mehrere Punkte ohne Komma → Tausender)

`parseGermanDate`:
- `30.12.2025` → `2025-12-30`
- `30.12.25` → `2025-12-30` (2-stelliges Jahr, <70 → 20xx)
- `05/01/2025` → `2025-01-05`
- ISO `YYYY-MM-DD` unverändert

## Dedup

16-Hex-Hash aus:
```
buchungstag | valutadatum | betrag | iban_counter | name | zweck | iban_konto | saldo
```
**Wichtig**: ohne `kontogruppe_id`. Re-Import desselben CSV in eine andere
Kontogruppe würde sonst Duplikate erzeugen. Bei kollidierendem Hash ohne
Kontogruppe wird `kontogruppe_id` nachgetragen (Falls existierender Eintrag
keine Zuordnung hatte).

## Umbuchungs-Erkennung

Pure Funktion in `lib/umbuchung-detection.ts`, getestet.

```
input: txns mit (id, buchungstag, betrag, ibanKonto, ibanCounter, name, kontogruppeId)
output: Set<txnId> die als Umbuchung gelten

Schritte (jede Tx kann auf einem dieser Wege markiert werden):
1. Paar-Matching (greedy)
   für jede negative Buchung X:
     suche positive Buchung Y mit:
       - |amount| gleich
       - kontogruppeId !== X.kontogruppeId (beide nicht NULL)
       - |date(Y) - date(X)| <= 3 Tage
       - nearest date wins
       - Y noch nicht gematcht
     → wenn gefunden: beide markieren
2. IBAN-Match
   counterparty-IBAN ist eigene IBAN → markieren
3. Kreditkarten-Settlement
   Konto mit art='kreditkarte' existiert
   UND Tx betrag < 0
   UND Counterparty-Name enthält 'mastercard', 'visa', 'amex', …
   → markieren
```

Ergebnis wird in `transactions.is_umbuchung` materialisiert. `umbuchung_override`
(NULL / 0 / 1) überlagert die Berechnung pro Tx.

Recompute läuft nach jedem Insert, Bulk-Delete, Kontogruppen-Create/Update/Delete.

## Kategorisierungs-Engine

`categorizeTransaction(tx, rules)` ist pure:
- Iteriert über `rules` (DB-`kategorien`-Einträge, sortiert nach `rule_order`)
- Für jede Regel: keywords werden gegen `verwendungszweck + name + buchungstext`
  geprüft (case-insensitive substring), namePatterns gegen `name` + komplette
  Suchstring
- Erste passende Regel gewinnt
- Fallback: `Sonstige Einnahmen` (Betrag > 0) oder `Sonstiges`

Import-Route lädt aktuelle Regeln aus DB und reicht sie an `parseCsvData` durch.

### AI-Override

`POST /api/ai/categorize { ids, force? }`:
- Wenn `force=false` (default): nur Buchungen mit `is_manual_override=0`
- Wenn `force=true`: überschreibt unabhängig vom manual-override; setzt
  `is_manual_override=0`, `ai_classified=1`
- Liest aktuelle erlaubte Kategorien aus `kategorien` (User-Kategorien sind
  damit für die AI verfügbar)
- Prompt: `temperature=0`, `num_predict=32`, eindeutig formuliert
- Fuzzy-Match: exact → startsWith → contains → inverse
- Jede Klassifikation wird in `logs` mitgeschrieben (event `ai.classify`)
- Concurrency-Lock: paralleler `POST` → 429

## API-Referenz (Auszug)

Alle mutierenden Routes nutzen Zod via `parseBody`-Helper, fehlerhafte Bodies
liefern 400 mit `issues[]`. Origin-Check via Middleware.

### Import

`POST /api/import` (multipart/form-data)
- `file` (CSV), `encoding`, `kontogruppeId`, `preset`, `mapping` (JSON),
  `separator`, `invertAmount`, `defaultCurrency`, `dryRun`
- 25 MiB Größen-Limit
- `dryRun=1`: kein Insert, Preview-Daten mit 30 Zeilen + Counts + Datums-Range
- Sonst: `{ inserted, skipped, total, insertedIds, parsed, encoding }`

`GET /api/imports` → `{ imports: [{ importedAt, count, dateFrom, dateTo, kontogruppen[] }] }`
`PATCH /api/imports { importedAt, kontogruppeId }` → Batch-Konto-Wechsel
`DELETE /api/imports { importedAt }` → Batch löschen

### Transactions

`GET /api/transactions` → `{ transactions[], stats }`
`DELETE /api/transactions` → alle löschen
`PATCH /api/transactions/[id]` → `{ kategorie? }` oder `{ umbuchung? }`
`PUT /api/transactions/[id]/tags` → `{ tagIds }` (ersetzt die Tag-Menge)
`PATCH /api/transactions-bulk` → `{ ids, kategorie? | umbuchung? | kontogruppeId? | addTagId? }`
`DELETE /api/transactions-bulk` → `{ ids }`

Hinweis: Die Bulk-Route liegt als Geschwister-Route unter
`/api/transactions-bulk` (nicht `/api/transactions/bulk`), um den
Next-16-Routing-Konflikt mit `[id]` zu vermeiden.

### Inhaber & Kontogruppen

`GET/POST /api/inhaber`, `PATCH/DELETE /api/inhaber/[id]`
`GET/POST /api/kontogruppen`, `PATCH/DELETE /api/kontogruppen/[id]`
`PUT/DELETE /api/kontogruppen/[id]/anchor` → `{ date, value }` setzt bzw.
löscht den Konto-Anker für die Saldo-Rekonstruktion

### Kategorien

`GET/POST /api/kategorien`, `PATCH/DELETE /api/kategorien/[id]`

### Suche

`GET /api/search?q=…&limit=…` → `{ transactions[], query }` (FTS5, Prefix-Suche
pro Token, Limit hart auf 1–500 geclampt). Leere Query liefert `[]`.

### Tags

`GET/POST /api/tags`, `PATCH/DELETE /api/tags/[id]`
`PUT /api/transactions/[id]/tags { tagIds }` — ersetzt die Tag-Menge
komplett für diese Transaktion (Set-Semantik).

### Recurring

`GET /api/recurring` → `{ series[] }` mit Intervall, ø-Betrag, letzter Betrag,
`priceChanged`-Flag, `nextExpected` und allen `transactionIds`. Wird bei
jedem Request frisch berechnet (Cache wäre eine Optimierung für später).

### Net-Worth

`GET /api/networth` → `{ assets[], liabilities[], history[], totals }` —
kombiniert Kontogruppen-Salden (`source: "konto"`) und manuelle Posten
(`source: "manual"`).

`GET/POST /api/assets`, `DELETE /api/assets/[id]`
`GET/POST /api/assets/[id]/snapshots` — `POST { date, value }` **oder**
`POST { date, quantity, unitPrice }` (beide > 0, nur gemeinsam); im
zweiten Fall berechnet der Server `value = quantity × unitPrice`
(auf Cent gerundet) und speichert die Aufschlüsselung mit. Upsert je
`(asset, date)`, `GET` liefert den Werteverlauf inkl. `quantity`/`unitPrice`.
Zod-Schema: `assetSnapshotSchema` in `api-validation.ts`.

Analog `/api/liabilities` und `/api/liabilities/[id]/snapshots`
(dort weiterhin nur `{ date, value }`).

Konto-Anker: `PUT/DELETE /api/kontogruppen/[id]/anchor` (siehe oben).

### Settings, Logs, KI

`GET/PUT /api/settings`
`GET/DELETE /api/logs?limit=…&offset=…`
`GET /api/ai/models?url=…` (Proxy)
`GET /api/ai/categorize` (Sonstiges-IDs), `POST /api/ai/categorize { ids, force? }`

## Sicherheit

| Schutz | Wie | Konfiguration |
|---|---|---|
| **CSRF** | `src/middleware.ts` vergleicht `Origin` mit Allowlist für mutierende API-Calls. CLI-Tools ohne Origin gehen durch. | `ALLOWED_ORIGINS` |
| **SSRF** | `isAllowedOllamaUrl` in `api-validation.ts` prüft Protokoll + Host. Defense-in-Depth: auch im AI-Endpoint nochmal validiert. | `ALLOWED_OLLAMA_HOSTS` |
| **Concurrency** | In-Memory-Flag `aiRunning` in `/api/ai/categorize` | — |
| **Input-Validation** | Zod auf allen mutierenden Routes | — |
| **AbortController** | Mount-Fetches in den Komponenten, durch bis zum Ollama-Fetch | — |

## Datenbank-Sicherung (Backup & Restore)

Einstellungen → **Datenbank**. Eine Sicherung ist eine vollständige Kopie der
SQLite-Datei (alle Tabellen, inkl. `settings`), erzeugt via `VACUUM INTO` —
ein konsistenter, kompakter Snapshot ohne `-wal`/`-shm`-Sidecar.

### Module
- `lib/backup-crypto.ts` (pure) — `encryptBackup`/`decryptBackup`/
  `isEncryptedBackup`. AES-256-GCM, Schlüssel via `scrypt(password, salt)`.
  Container-Layout: `MAGIC("MSBAK1\0\0", 8) | salt(16) | iv(12) | authTag(16) |
  ciphertext`. GCM ist authenticated → falsches Passwort oder Manipulation
  scheitern mit `BackupAuthError`.
- `lib/backup.ts` — Filesystem-Orchestrierung: `createBackup`,
  `createBackupBuffer` (Download ohne Ablage), `listBackups`, `readBackup`,
  `deleteBackup`, `restoreFromBuffer`/`restoreFromStored`,
  `createSafetySnapshot`. Pfad-Sicherheit über `resolveBackupPath` (nur
  Basenames in `backups/`, kein Path-Traversal). Ein In-Memory-`opInProgress`-
  Lock serialisiert Backup/Restore (→ 409 `BackupBusyError`).
- `lib/db.ts` — `getDbFilePath`, `vacuumInto`, `closeDb` (checkpointet das WAL
  per `wal_checkpoint(TRUNCATE)`, bevor geschlossen wird) und `reopenDb`.
- `lib/backup-response.ts` — Mapping der Fehlerklassen auf HTTP-Antworten mit
  `code`-Feld (`busy`, `not_found`, `password_required`, `wrong_password`,
  `invalid`, …) + `fileDownloadResponse`.

### Ablage
`<dataDir>/backups/` (Geschwister von `finanzen.db`). Im Docker-Setup liegt das
auf dem gemounteten Volume `/data` und überlebt Container-Neustarts.
Dateinamen: `meinsaldo-YYYYMMDD-HHMMSS.db` (unverschlüsselt) bzw. `.msbak`
(verschlüsselt); Schutz-Sicherungen `schutz-vor-restore-…` / `schutz-vor-leeren-…`.
Aufbewahrung: alle behalten (manuelles Löschen im UI).

### Restore-Ablauf (Datei-Tausch unter laufender Verbindung)
1. Bei `.msbak`: entschlüsseln → Temp-Datei in `backups/`.
2. Validieren: read-only öffnen, `PRAGMA quick_check = ok` **und** `schema_migrations`/
   `transactions` vorhanden (sonst `BackupInvalidError`).
3. `createSafetySnapshot("vor-restore")` — Sicherheitsnetz.
4. `closeDb()` (checkpoint), Sidecars `-wal`/`-shm` löschen,
   `fs.renameSync(tmp, dbPath)` ersetzt die Datei atomar (gleiche Partition).
5. `reopenDb()` öffnet die frische Datei und lässt `runMigrations()` laufen →
   eine **ältere** Sicherung wird automatisch aufs aktuelle Schema migriert.

### API
| Route | Zweck |
|---|---|
| `GET /api/backups` | Liste `{ name, size, createdAt, encrypted }` |
| `POST /api/backups` | `{ encrypt, password? }` legt Sicherung ab |
| `GET /api/backups/[name]` | Download (octet-stream) |
| `DELETE /api/backups/[name]` | löschen |
| `POST /api/backups/[name]/restore` | `{ password? }` aus abgelegter Sicherung |
| `POST /api/backup-download` | `{ encrypt, password? }` erzeugt & streamt ohne Ablage |
| `POST /api/backup-restore-upload` | multipart `file` (+ `password?`) einspielen |

Download/Upload liegen als **Geschwister-Routen** (nicht unter `/api/backups/`),
um den Next-16-Konflikt statischer Segmente mit dem dynamischen `[name]` zu
vermeiden — derselbe Grund wie bei `/api/transactions-bulk`. Passwörter werden
nie geloggt oder persistiert; bei Restore einer verschlüsselten Sicherung fragt
das UI danach (Server-`code: password_required` steuert den Dialog).
Schutz-Sicherung auch vor „DB leeren" (`DELETE /api/transactions`).

## Erweiterungspunkte

### Neue Bank
1. `lib/field-mapping.ts` — neuen `BankPreset` ans Array anhängen
2. Header-Zeilen → `preprocess`-Funktion
3. Kombinierte Felder → `rowTransform`-Funktion mit Regex
4. `docs/CSV_FORMATS.md` ergänzen, mit echtem Sample-CSV testen

### Neue Default-Kategorie
1. `lib/categories.ts` — neuen Eintrag in `categoryRules`
2. Reihenfolge beachten — spezifisch vor generisch
3. Beim Boot wird automatisch in die DB ge-seedet (`INSERT OR IGNORE`)
4. Bereits importierte Tx werden nicht neu kategorisiert (manuell oder via KI-Bulk)

### Neues Kontogruppen-Icon
1. `lib/icons.ts` — Import aus `lucide-react`, Eintrag in `ICON_MAP`

### Anderer LLM-Provider
1. `lib/ollama.ts` als Vorlage; gleiche Funktionssignatur für `categorizeWithOllama`
2. `/api/ai/categorize/route.ts` Client austauschen
3. Settings entsprechend erweitern (`api-validation.ts` + `AiSettings`-UI)

### Schema-Migration
Neue Migration ans Ende des `migrations[]`-Arrays in `lib/db.ts`:
```ts
{
  version: 8,
  description: "…",
  up: (db) => {
    ensureColumn(db, "transactions", "neue_spalte", "TEXT");
    // Backfill / Daten-Migration
  },
}
```
Wird beim nächsten `getDb()`-Aufruf einmal angewendet.

**Wichtig — Idempotenz**: Spalten-Ergänzungen über `ensureColumn(db, table,
column, definition)` statt direktem `ALTER TABLE … ADD COLUMN`. Grund:
`SCHEMA_V1` enthält den aktuellen Vollausbau aller Spalten; auf einer frischen
DB würde ein nacktes `ADD COLUMN` mit „duplicate column" crashen. `ensureColumn`
prüft via `PRAGMA table_info` und ist daher auf frischen wie bestehenden DBs
sicher. Migrationen v2–v4 sind entsprechend umgestellt.

Aktueller Stand: **v9**. v5 = FTS5-Index, v6 = Tags, v7 = Net-Worth,
v8 = Konto-Anker, v9 = FTS5 als reguläre Tabelle (Korruptionsfix).

## Build & Test

```bash
npm run dev      # Dev-Server mit Turbopack auf :3000
npm run build    # Production-Build
npm start        # Production-Server
npm test         # Vitest (run once)
npm run test:watch  # Vitest watch
npx tsc --noEmit # TypeScript-Check
npx eslint .     # Lint
```

**Tests** (145):
- *Domain-Logik* (pure): `parse-csv`, `categories`, `field-mapping`,
  `umbuchung-detection`, `date-range`, `recurring`, `networth`
  (inkl. `balanceAsOf`), `category-history`, `number-format`,
  `api-validation` (URL-Sicherheit).
- *API-Routes*: `/api/transactions` (inkl. Kategorie-Übernahme aus
  Verlauf), `/api/transactions-bulk`, `/api/inhaber`, `/api/kontogruppen`,
  `/api/kategorien`, `/api/search`, `/api/recurring`, `/api/tags`. Jeder Test
  bekommt über `setupFreshInMemoryDb()` (aus `lib/test-helpers.ts`) eine
  isolierte `:memory:`-SQLite — gesteuert über die `FINANZEN_DB_PATH`-Env-Var
  und `__resetDbForTests()`. Route-Handler werden direkt mit `NextRequest`
  aufgerufen, ohne laufenden Server.

## Theme-System

- `globals.css` definiert CSS-Custom-Properties für **Light** (`:root, .light`)
  und **Dark** (`.dark`) auf oklch-Basis
- Tailwind v4 `@theme inline` mappt sie auf semantische Utility-Klassen:
  `bg-surface`, `text-fg`, `border-border`, `text-positive`, `text-danger`,
  `text-magic` (KI), `text-warn`, …
- `ThemeProvider` setzt `html.light` / `html.dark` und persistiert in
  `localStorage`; ein blockierendes Script im `<head>` setzt die Klasse vor
  First-Paint (kein FOUC)
- `useChartTheme` (lib/chart-theme.ts) liest die aktuellen Var-Werte mit
  einem `MutationObserver` für Recharts-Inline-Styles
- `categoryPalette(resolved)` liefert eine theme-aware oklch-Palette für
  Kategorie-Visualisierungen

## Mobile-Ansicht (Smartphone)

Smartphone-Viewports (< 768px) bekommen eine eigene Oberfläche statt eines
responsiven Umbaus der Desktop-Ansicht. Der Switch lebt in `page.tsx`:
`useIsMobile()` (`lib/use-is-mobile.ts`, `matchMedia` über
`useSyncExternalStore`, SSR-Snapshot = Desktop) entscheidet **nach** allen
Hooks zwischen Desktop-JSX und `components/mobile/MobileApp.tsx`. Beide
Varianten teilen sich Datenladung (`loadFromDb`) und Mutations-Handler —
es gibt keine doppelte Fetch-Logik für Transaktionen.

- **Shell** (`MobileApp.tsx`): Sticky-Header mit ThemeToggle, fixe
  Bottom-Tab-Navigation (Übersicht · Buchungen · Vermögen · Abos) mit
  Safe-Area-Polster. Dafür setzt `layout.tsx` `viewportFit: "cover"` plus
  `themeColor` via `export const viewport`. Das Transaktions-Detail-Sheet
  wird in der Shell gehostet, damit Übersicht und Buchungsliste es teilen.
- **Übersicht**: Monats-Chips (abgeleitet aus vorhandenen Buchungsmonaten,
  Default = aktuellster Monat), Hero-Saldo mit Sparquote/Defizit-Pill,
  Monats-Cashflow der letzten 12 Monate als reine CSS-Balken (kein
  Recharts auf Mobile — Performance + Touch-Targets), Kategorie-Ranking
  (Top 6 + Rest, `categoryPalette`), letzte Buchungen. Kategorie-Tap
  springt in die Buchungsliste mit vorgesetztem Kategorie-Filter.
- **Buchungen**: clientseitige Suche + Richtungs-Chips, Gruppierung nach
  Buchungstag, Paging (50, dann +100). Tap öffnet das Bottom-Sheet
  (`MobileTransactionSheet`) mit Details und Kategorie-Wechsel über den
  bestehenden `PATCH /api/transactions/[id]`-Handler.
- **Vermögen / Abos**: read-only, eigene Mount-Fetches auf `/api/networth`
  bzw. `/api/recurring`; Net-Worth-Verlauf als leichtgewichtige
  SVG-Sparkline, Abos mit Fixkosten-Hochrechnung pro Monat.
- **Bewusst Desktop-only**: CSV-Import, Einstellungen, Bulk-Operationen,
  Tag-Pflege, Backups. Die Mobile-Ansicht ist eine Auswerte-/Nachschlage-
  Oberfläche, keine vollständige Verwaltungsoberfläche.

Umbuchungen sind in allen Mobile-Summen ausgeschlossen (entspricht dem
Desktop-Default); in Listen sind sie mit einem Pfeil-Icon markiert.

## Bekannte Einschränkungen

- **Single-User**: keine Auth, keine Multi-Tenant-Trennung
- **Single-Process**: SQLite-WAL erlaubt mehrere Reader, aber nur ein Writer
  (kein Problem in der aktuellen Nutzung)
- **CSRF nur via Origin**: kein Token-basiertes CSRF (für single-user
  localhost ausreichend)
- **Ollama-Sequential**: Klassifikation läuft sequentiell in Batches von 3
  Buchungen — kein paralleles Inferencing
- **Kein Logging-Retention-System**: Auto-Trim bei >5000 Log-Einträgen, kein
  externes Log-Storage
- **Backup ohne Zeitplan**: Sicherungen sind manuell (Einstellungen →
  Datenbank); zusätzlich entsteht automatisch eine Schutz-Sicherung vor
  Restore und „DB leeren". Keine zeitgesteuerten Backups (siehe Backup-Abschnitt).
- **DB unverschlüsselt at rest**: `finanzen.db` (bzw. das Docker-Volume `/data`)
  liegt im Klartext auf der Platte — eine DB-Verschlüsselung im Betrieb
  (SQLCipher o.ä.) ist bewusst **nicht** eingebaut. Schutz bei Bedarf über
  Datenträger-/Ordner-Verschlüsselung (FileVault, LUKS, verschlüsseltes
  NAS-Volume) und Zugriffsrechte. Nur die **Sicherungsdateien** lassen sich
  optional AES-256-verschlüsseln (siehe Backup-Abschnitt).
