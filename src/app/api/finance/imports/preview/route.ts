import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  importFormatSchema,
  parseImportFile,
  toPreviewLines,
} from "@/features/finance/lib/importers/importFile";
import { handleApiError, ok } from "@/lib/http/api-response";
import { Transaction } from "@/models/Transaction";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const form = await request.formData();
    const file = form.get("file");
    const bankAccountId = z.string().min(1).parse(form.get("bankAccountId"));
    const formatRaw = form.get("format");
    let format = importFormatSchema.parse(
      typeof formatRaw === "string" && formatRaw ? formatRaw : "ofx",
    );
    if (!(file instanceof File)) throw new Error("Arquivo obrigatório.");
    const text = await file.text();

    if (format === "ofx" && file.name.toLowerCase().endsWith(".csv")) {
      format = "csv-generic";
    }

    const parsed = parseImportFile(format, text);
    const lines = toPreviewLines(parsed);

    let duplicates = 0;
    for (const line of lines) {
      if (!line.externalId) continue;
      const exists = await Transaction.findOne({
        userId: user.userId,
        externalId: line.externalId,
        bankAccountId,
      });
      if (exists) {
        duplicates += 1;
        line.selected = false;
      }
    }

    return ok({ lines, duplicates, format, bankAccountId });
  } catch (error) {
    return handleApiError(error);
  }
}
