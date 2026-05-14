import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ALLOWED = "http://localhost:3000,http://127.0.0.1:3000";

function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF-Schutz: prüft Origin-Header bei zustandsändernden API-Requests.
 *
 * Strategie: Wenn der Browser einen Origin-Header sendet (jedes
 * fetch/XHR/form-Submit aus einem anderen Tab tut das), muss er einem
 * erlaubten Wert entsprechen. Fehlt der Header (z.B. curl, server-zu-server,
 * Tooling), wird der Request durchgelassen — das adressiert genau das
 * Browser-CSRF-Szenario ohne lokale CLI-Tools zu blocken.
 */
export function middleware(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return NextResponse.next();
  if (!req.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().includes(origin)) {
    return NextResponse.json(
      { error: "cross-origin request abgelehnt" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
