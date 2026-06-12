import { NextRequest, NextResponse } from "next/server";
import { restoreFromBuffer } from "../../../lib/backup";
import { backupErrorResponse } from "../../../lib/backup-response";

const MAX_UPLOAD_BYTES = 256 * 1024 * 1024;

/**
 * Spielt eine hochgeladene Sicherungsdatei ein (multipart/form-data: `file`,
 * optional `password`). Sibling-Route (siehe `/api/backup-download`).
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Upload (kein multipart/form-data)" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei übergeben" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Datei ist zu groß (max. 256 MiB)" },
      { status: 413 }
    );
  }

  const passwordRaw = form.get("password");
  const password =
    typeof passwordRaw === "string" && passwordRaw.length > 0
      ? passwordRaw
      : undefined;

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    restoreFromBuffer(buf, password);
    return NextResponse.json({ restored: true });
  } catch (e) {
    return backupErrorResponse(e);
  }
}
