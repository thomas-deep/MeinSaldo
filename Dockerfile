# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# MeinSaldo — Production-Container.
#
# Mehrstufiger Build mit Next.js `output: "standalone"`:
#   1. deps     — installiert npm-Abhängigkeiten inkl. better-sqlite3 (nativ)
#   2. builder  — Next.js Production-Build, erzeugt .next/standalone
#   3. runner   — minimales Laufzeit-Image ohne Build-Tools, kopiert nur
#                 standalone-Tree + Static-Assets + public/
#
# Das Image ist multi-arch (linux/amd64, linux/arm64) und damit auf
# Synology, UGreen und ähnlichen NAS-Geräten direkt lauffähig.
# Die SQLite-DB liegt unter /data im Container und wird per Volume
# persistiert.
# ---------------------------------------------------------------------------

FROM node:22-alpine AS base
RUN apk add --no-cache libstdc++

# ---- deps: Native Module brauchen Build-Tools (python3, g++, make) ----
FROM base AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci

# ---- builder: Next.js Production-Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY app/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimales Laufzeit-Image (~150 MB statt ~600 MB) ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    FINANZEN_DB_PATH=/data/finanzen.db

# nicht-root User + persistenter Datenordner
RUN addgroup -S app && adduser -S app -G app \
 && mkdir -p /data \
 && chown -R app:app /data

# Standalone-Bundle (enthält server.js + minimaler node_modules-Tree)
COPY --from=builder --chown=app:app /app/.next/standalone ./
# Static-Assets (Tailwind-Output, Fonts) liegen außerhalb des standalone-Trees
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public

USER app
EXPOSE 3000
VOLUME ["/data"]

# Einfacher Health-Indikator: Liefert die Settings-Route 200, läuft die App.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/settings >/dev/null || exit 1

# `npm start` würde wieder Next.js' eigenen Wrapper laden — bei standalone
# starten wir den vorgenerierten server.js direkt.
CMD ["node", "server.js"]
