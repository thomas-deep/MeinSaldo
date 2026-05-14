import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "../../../../lib/db";
import { listOllamaModels } from "../../../../lib/ollama";

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get("url") || getSetting("ollama_url") || "http://localhost:11434";
  try {
    const models = await listOllamaModels(url);
    return NextResponse.json({ models });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
