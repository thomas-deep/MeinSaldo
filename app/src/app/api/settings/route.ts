import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "../../../lib/db";
import { parseBody, settingsSchema } from "../../../lib/api-validation";

export async function GET() {
  const settings = getAllSettings();
  return NextResponse.json({
    ollamaEnabled: settings.ollama_enabled === "1",
    ollamaUrl: settings.ollama_url ?? "http://localhost:11434",
    ollamaModel: settings.ollama_model ?? "",
  });
}

export async function PUT(req: NextRequest) {
  const parsed = await parseBody(req, settingsSchema);
  if (!parsed.ok) return parsed.response;
  const { ollamaEnabled, ollamaUrl, ollamaModel } = parsed.data;

  if (ollamaEnabled !== undefined) {
    setSetting("ollama_enabled", ollamaEnabled ? "1" : "0");
  }
  if (ollamaUrl !== undefined) {
    setSetting("ollama_url", ollamaUrl);
  }
  if (ollamaModel !== undefined) {
    setSetting("ollama_model", ollamaModel);
  }
  return NextResponse.json({ ok: true });
}
