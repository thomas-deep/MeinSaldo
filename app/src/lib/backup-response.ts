import { NextResponse } from "next/server";
import {
  BackupAuthError,
  BackupBusyError,
  BackupInvalidError,
  BackupNameError,
  BackupNotFoundError,
  BackupPasswordRequiredError,
} from "./backup";

/**
 * Bildet die Backup-Fehlerklassen auf konsistente HTTP-Antworten ab. Das
 * `code`-Feld erlaubt dem Client, gezielt zu reagieren (z.B. bei
 * `password_required` einen Passwort-Dialog zu öffnen und erneut zu senden).
 */
export function backupErrorResponse(e: unknown): NextResponse {
  if (e instanceof BackupBusyError) {
    return NextResponse.json({ error: e.message, code: "busy" }, { status: 409 });
  }
  if (e instanceof BackupNotFoundError) {
    return NextResponse.json(
      { error: e.message, code: "not_found" },
      { status: 404 }
    );
  }
  if (e instanceof BackupNameError) {
    return NextResponse.json(
      { error: e.message, code: "bad_name" },
      { status: 400 }
    );
  }
  if (e instanceof BackupPasswordRequiredError) {
    return NextResponse.json(
      { error: e.message, code: "password_required" },
      { status: 400 }
    );
  }
  if (e instanceof BackupAuthError) {
    return NextResponse.json(
      { error: e.message, code: "wrong_password" },
      { status: 400 }
    );
  }
  if (e instanceof BackupInvalidError) {
    return NextResponse.json(
      { error: e.message, code: "invalid" },
      { status: 400 }
    );
  }
  const msg = e instanceof Error ? e.message : "unbekannter Fehler";
  return NextResponse.json({ error: msg }, { status: 400 });
}

/** Baut eine Datei-Download-Antwort (octet-stream + Content-Disposition). */
export function fileDownloadResponse(filename: string, data: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(data.length),
      "Cache-Control": "no-store",
    },
  });
}
