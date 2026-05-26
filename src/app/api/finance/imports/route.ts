import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import type { ParsedOfxTransaction } from "@/features/finance/lib/importers/ofx";
import { parseOfxContent } from "@/features/finance/lib/importers/ofx";
import { parseCsvContentToTransactions } from "@/features/finance/lib/importers/csvMapped";
import { created, handleApiError } from "@/lib/http/api-response";
import { z } from "zod";
import { ImportBatch } from "@/models/ImportBatch";
import { Transaction } from "@/models/Transaction";

const importFormatSchema = z.enum([
  "ofx",
  "csv-generic",
  "csv-nubank",
  "csv-mercadopago",
]);

function parseImportFile(
  format: z.infer<typeof importFormatSchema>,
  text: string,
): ParsedOfxTransaction[] {
  if (format === "ofx") {
    return parseOfxContent(text);
  }
  return parseCsvContentToTransactions(text);
}

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

    const batch = await ImportBatch.create({
      userId: user.userId,
      bankAccountId,
      format,
      originalFileName: file.name,
      parsedCount: 0,
      status: "preview",
    });
    let imported = 0;
    let dup = 0;
    for (const p of parsed) {
      if (p.externalId) {
        const exists = await Transaction.findOne({
          userId: user.userId,
          externalId: p.externalId,
          bankAccountId,
        });
        if (exists) {
          dup += 1;
          continue;
        }
      }
      await Transaction.create({
        userId: user.userId,
        bankAccountId,
        title: p.title,
        amount: p.amount,
        type: p.type,
        category: "Outro",
        status: "confirmed",
        occurredAt: p.occurredAt,
        externalId: p.externalId,
        importBatchId: batch._id,
        reconciled: false,
      });
      imported += 1;
    }
    await ImportBatch.updateOne(
      { _id: batch._id },
      {
        $set: {
          parsedCount: parsed.length,
          importedCount: imported,
          duplicateCount: dup,
          status: "imported",
        },
      },
    );
    const { recalculateAccountBalance } = await import("@/features/finance/lib/ledger");
    await recalculateAccountBalance(user.userId, bankAccountId);
    return created({ batchId: String(batch._id), imported, duplicates: dup });
  } catch (error) {
    return handleApiError(error);
  }
}
