import { NextRequest, NextResponse } from "next/server";
import { z, ZodSchema } from "zod";

export type Validated<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<Validated<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "invalid JSON body" },
        { status: 400 }
      ),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "validation failed",
          issues: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: result.data };
}

export const kontogruppeTypeSchema = z.enum([
  "privat",
  "gemeinsam",
  "firma",
  "kreditkarte",
]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss ISO-Format YYYY-MM-DD haben")
  .or(z.literal(""));

export const transactionSchema = z.object({
  id: z.string(),
  kontoBezeichnung: z.string(),
  ibanKonto: z.string(),
  buchungstag: isoDate,
  valutadatum: isoDate,
  nameZahlungsbeteiligter: z.string(),
  ibanZahlungsbeteiligter: z.string(),
  buchungstext: z.string(),
  verwendungszweck: z.string(),
  betrag: z.number(),
  waehrung: z.string(),
  saldoNachBuchung: z.number(),
  kategorie: z.string(),
  kontogruppeId: z.number().nullable().optional(),
  isUmbuchung: z.boolean().optional(),
});

export const transactionsPostSchema = z.object({
  transactions: z.array(transactionSchema),
  kontogruppeId: z.number().nullable().optional(),
});

export const transactionPatchSchema = z
  .object({
    kategorie: z.string().min(1).max(64).optional(),
    umbuchung: z.union([z.boolean(), z.null()]).optional(),
  })
  .refine(
    (data) => data.kategorie !== undefined || data.umbuchung !== undefined,
    { message: "Mindestens ein Feld (kategorie oder umbuchung) erforderlich" }
  );

export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Farbe muss Hex-Code wie #aabbcc sein");

export const kontogruppeCreateSchema = z.object({
  name: z.string().min(1).max(64),
  type: kontogruppeTypeSchema,
  color: hexColor,
  icon: z.string().max(32).optional(),
  bank: z.string().max(64).nullable().optional(),
});

export const kontogruppeUpdateSchema = kontogruppeCreateSchema;

export const settingsSchema = z
  .object({
    ollamaEnabled: z.boolean().optional(),
    ollamaUrl: z
      .string()
      .url("ollamaUrl ist keine gültige URL")
      .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
        message: "ollamaUrl muss http(s) sein",
      })
      .optional(),
    ollamaModel: z.string().max(128).optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "Mindestens ein Feld erforderlich" }
  );

export const aiCategorizeSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "ids array darf nicht leer sein"),
});
