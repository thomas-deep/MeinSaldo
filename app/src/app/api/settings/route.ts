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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const data = body as {
    ollamaEnabled?: unknown;
    ollamaUrl?: unknown;
    ollamaModel?: unknown;
  };
  if (typeof data.ollamaEnabled === "boolean") {
    setSetting("ollama_enabled", data.ollamaEnabled ? "1" : "0");
  }
  if (typeof data.ollamaUrl === "string") {
    try {
      const u = new URL(data.ollamaUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return NextResponse.json(
          { error: "ollamaUrl muss http(s) sein" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "ollamaUrl ist keine gültige URL" },
        { status: 400 }
      );
    }
    setSetting("ollama_url", data.ollamaUrl);
  }
  if (typeof data.ollamaModel === "string") {
    setSetting("ollama_model", data.ollamaModel);
  }
  return NextResponse.json({ ok: true });
}
