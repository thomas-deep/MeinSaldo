# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# MeinSaldo — Production-Container.
#
# Mehrstufiger Build:
#   1. deps     — installiert npm-Abhängigkeiten inkl. better-sqlite3 (nativ)
#   2. builder  — Next.js Production-Build
#   3. runner   — schlankes Laufzeit-Image ohne Build-Tools
#
# Die SQLite-DB liegt unter /data im Container und wird per Volume persistiert.
# ---------------------------------------------------------------------------

FROM node:22-alpine AS base
RUN apk add --no-cache libstdc++

# ---- deps: Native Module brauchen Build-Tools (python3, g++, make) ----
FROM base AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci

# ---- builder: Next.js-Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY app/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimales Laufzeit-Image ----
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

COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/package.json ./package.json

USER app
EXPOSE 3000
VOLUME ["/data"]

# Einfacher Health-Indikator: Liefert die Settings-Route 200, läuft die App.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/settings >/dev/null || exit 1

CMD ["npm", "start"]
