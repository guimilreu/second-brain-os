import { z } from "zod";
import type { ParsedOfxTransaction } from "@/features/finance/lib/importers/ofx";
import { parseOfxContent } from "@/features/finance/lib/importers/ofx";
import { parseCsvContentToTransactions } from "@/features/finance/lib/importers/csvMapped";

export const importFormatSchema = z.enum([
  "ofx",
  "csv-generic",
  "csv-nubank",
  "csv-mercadopago",
]);

export type ImportFormat = z.infer<typeof importFormatSchema>;

export type ImportPreviewLine = {
  title: string;
  amount: number;
  type: "income" | "expense";
  occurredAt: string;
  externalId?: string;
  selected: boolean;
};

export function parseImportFile(
  format: ImportFormat,
  text: string,
): ParsedOfxTransaction[] {
  if (format === "ofx") {
    return parseOfxContent(text);
  }
  return parseCsvContentToTransactions(text);
}

export function toPreviewLines(parsed: ParsedOfxTransaction[]): ImportPreviewLine[] {
  return parsed.map((p) => ({
    title: p.title,
    amount: p.amount,
    type: p.type,
    occurredAt: p.occurredAt.toISOString(),
    externalId: p.externalId,
    selected: true,
  }));
}
