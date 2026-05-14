import { NextRequest, NextResponse } from "next/server";
import { setUmbuchungOverride, updateCategory } from "../../../../lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const data = body as { kategorie?: unknown; umbuchung?: unknown };

  if (typeof data.kategorie === "string") {
    const updated = updateCategory(id, data.kategorie);
    return NextResponse.json({ updated });
  }

  if ("umbuchung" in data) {
    const value =
      data.umbuchung === null ? null : Boolean(data.umbuchung);
    const updated = setUmbuchungOverride(id, value);
    return NextResponse.json({ updated });
  }

  return NextResponse.json({ error: "no update field" }, { status: 400 });
}
