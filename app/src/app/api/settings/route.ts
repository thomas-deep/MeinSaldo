import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "../../../lib/db";

export async function GET() {
  const settings = getAllSettings();
  return NextResponse.json({
    ollamaEnabled: settings.ollama_enabled === "1",
    ollamaUrl: settings.ollama_url ?? "http://localhost:11434",
    ollamaModel: settings.ollama_model ?? "",
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (typeof body.ollamaEnabled === "boolean") {
    setSetting("ollama_enabled", body.ollamaEnabled ? "1" : "0");
  }
  if (typeof body.ollamaUrl === "string") {
    setSetting("ollama_url", body.ollamaUrl);
  }
  if (typeof body.ollamaModel === "string") {
    setSetting("ollama_model", body.ollamaModel);
  }
  return NextResponse.json({ ok: true });
}
