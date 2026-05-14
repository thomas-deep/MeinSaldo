import { NextRequest, NextResponse } from "next/server";
import { setUmbuchungOverride, updateCategory } from "../../../../lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (typeof body.kategorie === "string") {
    const updated = updateCategory(id, body.kategorie);
    return NextResponse.json({ updated });
  }

  if ("umbuchung" in body) {
    const value =
      body.umbuchung === null
        ? null
        : Boolean(body.umbuchung);
    const updated = setUmbuchungOverride(id, value);
    return NextResponse.json({ updated });
  }

  return NextResponse.json({ error: "no update field" }, { status: 400 });
}
