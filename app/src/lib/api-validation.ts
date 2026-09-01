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

export const inhaberTypeSchema = z.enum([
  "privat",
  "gemeinsam",
  "firma",
]);

export const kontogruppeArtSchema = z.enum([
  "girokonto",
  "sparkonto",
  "kreditkarte",
  "depot",
  "sonstiges",
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
  inhaberId: z.number().int().positive(),
  art: kontogruppeArtSchema.optional(),
  color: hexColor,
  icon: z.string().max(32).optional(),
  bank: z.string().max(64).nullable().optional(),
  iban: z.string().max(64).nullable().optional(),
});

export const kontogruppeUpdateSchema = kontogruppeCreateSchema;

export const inhaberCreateSchema = z.object({
  name: z.string().min(1).max(64),
  type: inhaberTypeSchema,
  color: hexColor,
});

export const inhaberUpdateSchema = inhaberCreateSchema;

export const tagCreateSchema = z.object({
  name: z.string().min(1).max(32),
  color: hexColor,
});

export const tagUpdateSchema = tagCreateSchema;

export const filterPresetCreateSchema = z.object({
  name: z.string().min(1).max(64),
  payload: z.string().min(1).max(16_000),
});

export const filterPresetUpdateSchema = filterPresetCreateSchema;

export const transactionTagsSchema = z.object({
  tagIds: z.array(z.number().int().positive()).max(32),
});

export const assetCreateSchema = z.object({
  name: z.string().min(1).max(64),
  kind: z.string().min(1).max(32).optional(),
  note: z.string().max(500).nullable().optional(),
});

export const liabilityCreateSchema = z.object({
  name: z.string().min(1).max(64),
  kind: z.string().min(1).max(32).optional(),
  note: z.string().max(500).nullable().optional(),
});

export const snapshotSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss ISO-Format YYYY-MM-DD haben"),
  value: z.number().finite(),
});

/** Asset-Snapshots können statt `value` auch `quantity` + `unitPrice`
 *  mitschicken (z. B. Gold: Menge in oz × Preis); der Server berechnet
 *  daraus den Wert. Liabilities und Bulk-Import bleiben value-only. */
export const assetSnapshotSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss ISO-Format YYYY-MM-DD haben"),
    value: z.number().finite().optional(),
    quantity: z.number().finite().positive().optional(),
    unitPrice: z.number().finite().positive().optional(),
  })
  .superRefine((d, ctx) => {
    const hasQuantity = d.quantity !== undefined;
    const hasPrice = d.unitPrice !== undefined;
    if (hasQuantity !== hasPrice) {
      ctx.addIssue({
        code: "custom",
        message: "quantity und unitPrice nur gemeinsam angeben",
      });
    } else if (!hasQuantity && d.value === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Entweder value oder quantity + unitPrice erforderlich",
      });
    }
  });

export const anchorSchema = snapshotSchema;

export const snapshotsBulkSchema = z.object({
  snapshots: z.array(snapshotSchema).min(1).max(2000),
});

function allowedOllamaHosts(): string[] {
  const env = process.env.ALLOWED_OLLAMA_HOSTS;
  if (env && env.trim()) {
    return env
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return ["localhost", "127.0.0.1", "::1"];
}

export function isAllowedOllamaUrl(value: string): {
  ok: boolean;
  reason?: string;
} {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "ollamaUrl ist keine gültige URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "ollamaUrl muss http(s) sein" };
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!allowedOllamaHosts().includes(host)) {
    return {
      ok: false,
      reason: `Host '${host}' nicht erlaubt — nur ${allowedOllamaHosts().join(", ")} (per ALLOWED_OLLAMA_HOSTS erweiterbar)`,
    };
  }
  return { ok: true };
}

export const settingsSchema = z
  .object({
    ollamaEnabled: z.boolean().optional(),
    ollamaUrl: z
      .string()
      .superRefine((v, ctx) => {
        const check = isAllowedOllamaUrl(v);
        if (!check.ok) {
          ctx.addIssue({
            code: "custom",
            message: check.reason ?? "ungültige ollamaUrl",
          });
        }
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
  force: z.boolean().optional(),
});

export const backupCreateSchema = z
  .object({
    encrypt: z.boolean(),
    password: z.string().min(1).max(256).optional(),
  })
  .refine((d) => !d.encrypt || (d.password?.length ?? 0) > 0, {
    message: "Passwort erforderlich für verschlüsselte Sicherung",
    path: ["password"],
  });

export const backupRestoreSchema = z.object({
  password: z.string().min(1).max(256).optional(),
});
