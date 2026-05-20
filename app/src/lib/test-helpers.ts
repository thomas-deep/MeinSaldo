import { beforeEach, afterEach } from "vitest";
import { __resetDbForTests } from "./db";

/**
 * Setup für Tests, die die SQLite-DB anfassen: Vor jedem Test wird die DB
 * auf `:memory:` umgestellt und das Singleton zurückgesetzt, sodass jeder Test
 * eine frische, leere DB sieht. Nach dem Test wird wieder zurückgesetzt.
 */
export function setupFreshInMemoryDb(): void {
  beforeEach(() => {
    process.env.FINANZEN_DB_PATH = ":memory:";
    __resetDbForTests();
  });
  afterEach(() => {
    __resetDbForTests();
    delete process.env.FINANZEN_DB_PATH;
  });
}

/** Baut einen `Request` mit JSON-Body, damit Route-Handler ihn parsen können. */
export function jsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
