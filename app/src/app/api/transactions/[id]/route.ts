import { NextRequest, NextResponse } from "next/server";
import { setUmbuchungOverride, updateCategory } from "../../../../lib/db";
import {
  parseBody,
  transactionPatchSchema,
} from "../../../../lib/api-validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseBody(req, transactionPatchSchema);
  if (!parsed.ok) return parsed.response;
  const { kategorie, umbuchung } = parsed.data;

  if (typeof kategorie === "string") {
    const updated = updateCategory(id, kategorie);
    return NextResponse.json({ updated });
  }

  if (umbuchung !== undefined) {
    const updated = setUmbuchungOverride(id, umbuchung);
    return NextResponse.json({ updated });
  }

  return NextResponse.json({ error: "no update field" }, { status: 400 });
}
