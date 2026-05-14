import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting, logEvent } from "../../../lib/db";
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

  const changes: string[] = [];
  if (ollamaEnabled !== undefined) {
    setSetting("ollama_enabled", ollamaEnabled ? "1" : "0");
    changes.push(`ollamaEnabled=${ollamaEnabled}`);
  }
  if (ollamaUrl !== undefined) {
    setSetting("ollama_url", ollamaUrl);
    changes.push(`ollamaUrl=${ollamaUrl}`);
  }
  if (ollamaModel !== undefined) {
    setSetting("ollama_model", ollamaModel);
    changes.push(`ollamaModel=${ollamaModel}`);
  }
  if (changes.length > 0) {
    logEvent("info", "settings", `Settings geändert: ${changes.join(", ")}`, {
      changes,
    });
  }
  return NextResponse.json({ ok: true });
}
