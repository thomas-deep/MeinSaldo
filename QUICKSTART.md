# Quickstart — MeinSaldo mit Docker

Die einfachste Variante: ein Docker-Container, eine Compose-Datei, ein Befehl.
Geeignet für Nutzer ohne Node-/Toolchain-Erfahrung.

## Voraussetzungen

- **Docker** + **Docker Compose** (im Docker Desktop enthalten,
  auf Linux: `docker engine` + `docker-compose-plugin`)
- ca. 1 GB Plattenplatz (Image + Daten); zusätzlich ca. 2 GB, wenn die
  lokale KI mitläuft und ein kleines Sprachmodell geladen wird

Test: `docker --version` und `docker compose version` müssen funktionieren.

## In drei Schritten starten

```bash
git clone https://github.com/thomas-deep/MeinSaldo.git
cd MeinSaldo
docker compose up -d
```

Beim ersten Lauf baut Docker das Image (dauert je nach Internet/CPU 2–5 min).
Danach erreichbar unter **<http://localhost:3000>**.

Stoppen mit `docker compose down` — die Daten bleiben erhalten.

## Was passiert da?

| Container | Zweck | Port | Standard |
|---|---|---|---|
| `meinsaldo` | die App selbst (Next.js) | 3000 (auf den Host gemappt) | **an** |
| `ollama` | lokales Sprachmodell für die KI-Kategorisierung | nur intern | **an** |

Die SQLite-Datenbank liegt im benannten Volume `meinsaldo-data` und überlebt
`docker compose down`. Ollama-Modelle analog in `ollama-data`.

## KI-Kategorisierung einrichten

Der Ollama-Container läuft, ist aber leer. Einmalig ein kleines Modell laden:

```bash
docker compose exec ollama ollama pull llama3.2:3b
```

Dann in der App: **Einstellungen → KI-Kategorisierung**
- Ollama aktivieren
- URL: `http://ollama:11434`
- Modell: `llama3.2:3b`
- Speichern, „Verbindung testen" muss grün werden

Größere Modelle (`llama3.1:8b`, `qwen2.5:7b` …) treffen besser, brauchen aber
mehr RAM und Zeit pro Buchung.

Die regelbasierte Kategorisierung läuft auch ohne — die KI ist Kür.

### Du hast Ollama schon auf dem Host?

Wer Ollama bereits direkt auf dem Rechner laufen hat, braucht den zweiten
Container nicht. Starte nur die App und zeige sie auf den Host-Ollama:

```bash
docker compose up -d meinsaldo
```

In der App **Einstellungen → KI-Kategorisierung**:
- Ollama-URL: `http://host.docker.internal:11434`

`host.docker.internal` und die passende Allowlist sind im Compose schon
vorbereitet — das funktioniert auf Docker Desktop (macOS/Windows) und Linux.

## Daten

### Wo liegen sie?

Im Docker-Volume `meinsaldo-data` — nicht im Repo. Anzeigen:

```bash
docker volume inspect meinsaldo_meinsaldo-data
```

(Der Präfix `meinsaldo_` ist der Compose-Projektname.)

### Backup

```bash
docker run --rm \
  -v meinsaldo_meinsaldo-data:/data \
  -v "$PWD":/backup \
  alpine tar czf /backup/meinsaldo-backup-$(date +%F).tgz /data
```

Erzeugt `meinsaldo-backup-YYYY-MM-DD.tgz` im aktuellen Verzeichnis.

### Restore

```bash
docker compose down
docker run --rm \
  -v meinsaldo_meinsaldo-data:/data \
  -v "$PWD":/backup \
  alpine sh -c "cd / && tar xzf /backup/meinsaldo-backup-YYYY-MM-DD.tgz"
docker compose up -d
```

### Komplett zurücksetzen

```bash
docker compose down -v
```

Das Flag `-v` löscht **auch** die Volumes — alle Daten sind weg.

## Update auf eine neue Version

```bash
git pull
docker compose up -d --build
```

Datenbank-Migrationen laufen beim ersten Start der neuen Version automatisch.
Trotzdem **vorher das Backup** machen.

## Anderer Host / Port

Wer die App nicht unter `http://localhost:3000` aufruft (z. B. im Heimnetz
unter `http://192.168.x.x:3000`), muss die Allowlist erweitern. In
`docker-compose.yml`:

```yaml
environment:
  ALLOWED_ORIGINS: "http://localhost:3000,http://192.168.1.42:3000"
```

Danach `docker compose up -d`.

## Fehlersuche

| Symptom | Behebung |
|---|---|
| `Port 3000 in use` | anderer Prozess auf 3000 — entweder stoppen oder in der Compose `"3001:3000"` mappen |
| App lädt, KI-Test schlägt fehl | Modell noch nicht gepullt (siehe oben) oder `ALLOWED_OLLAMA_HOSTS` enthält `ollama` nicht |
| `meinsaldo` startet immer wieder neu | `docker compose logs meinsaldo` ansehen — meist Permission-Probleme am Volume, dann `docker compose down -v` und neu (frisches Volume) |

## Was Docker nicht macht

- **Keine automatischen Updates** — das ist Absicht (Software-Hoheit beim Nutzer).
- **Kein Reverse-Proxy/TLS** — die App ist als Single-User-Localhost gedacht.
  Wer sie öffentlich exponieren will, hängt einen Reverse-Proxy (Caddy, nginx)
  davor und sollte sich der Sicherheitslage bewusst sein (keine Server-Auth!).

Für lokales Entwickeln ohne Docker siehe `CONTRIBUTING.md`.
