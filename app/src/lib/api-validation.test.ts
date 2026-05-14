import { afterEach, describe, expect, it } from "vitest";
import { isAllowedOllamaUrl } from "./api-validation";

const ORIG_ENV = process.env.ALLOWED_OLLAMA_HOSTS;
afterEach(() => {
  if (ORIG_ENV === undefined) delete process.env.ALLOWED_OLLAMA_HOSTS;
  else process.env.ALLOWED_OLLAMA_HOSTS = ORIG_ENV;
});

describe("isAllowedOllamaUrl", () => {
  it("erlaubt localhost http(s)", () => {
    expect(isAllowedOllamaUrl("http://localhost:11434").ok).toBe(true);
    expect(isAllowedOllamaUrl("https://localhost:11434").ok).toBe(true);
  });

  it("erlaubt 127.0.0.1 und ::1", () => {
    expect(isAllowedOllamaUrl("http://127.0.0.1:11434").ok).toBe(true);
    expect(isAllowedOllamaUrl("http://[::1]:11434").ok).toBe(true);
  });

  it("blockt interne LAN-IPs (Default)", () => {
    expect(isAllowedOllamaUrl("http://192.168.0.10:11434").ok).toBe(false);
    expect(isAllowedOllamaUrl("http://10.0.0.5:11434").ok).toBe(false);
    expect(isAllowedOllamaUrl("http://169.254.169.254/latest/meta-data/").ok).toBe(
      false
    );
  });

  it("blockt externe Hosts", () => {
    expect(isAllowedOllamaUrl("https://evil.example.com:11434").ok).toBe(false);
  });

  it("blockt non-http(s)-Protokolle", () => {
    expect(isAllowedOllamaUrl("file:///etc/passwd").ok).toBe(false);
    expect(isAllowedOllamaUrl("gopher://localhost:11434").ok).toBe(false);
  });

  it("blockt invalide URLs", () => {
    expect(isAllowedOllamaUrl("nicht-eine-url").ok).toBe(false);
    expect(isAllowedOllamaUrl("").ok).toBe(false);
  });

  it("respektiert ALLOWED_OLLAMA_HOSTS-Override", () => {
    process.env.ALLOWED_OLLAMA_HOSTS = "ollama.internal,localhost";
    expect(isAllowedOllamaUrl("http://ollama.internal:11434").ok).toBe(true);
    expect(isAllowedOllamaUrl("http://localhost:11434").ok).toBe(true);
    expect(isAllowedOllamaUrl("http://127.0.0.1:11434").ok).toBe(false);
  });
});
