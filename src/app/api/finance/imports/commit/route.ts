import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { importFormatSchema } from "@/features/finance/lib/importers/importFile";
import { created, handleApiError } from "@/lib/http/api-response";
import { ImportBatch } from "@/models/ImportBatch";
import { Transaction } from "@/models/Transaction";
import { z } from "zod";

const commitLineSchema = z.object({
  title: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  occurredAt: z.coerce.date(),
  externalId: z.string().optional(),
  selected: z.boolean().optional().default(true),
});

const commitSchema = z.object({
  bankAccountId: z.string().min(1),
  format: importFormatSchema.optional().default("ofx"),
  originalFileName: z.string().optional().default(""),
  lines: z.array(commitLineSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const body = commitSchema.parse(await request.json());
    const selected = body.lines.filter((line) => line.selected !== false);

    const batch = await ImportBatch.create({
      userId: user.userId,
      bankAccountId: body.bankAccountId,
      format: body.format,
      originalFileName: body.originalFileName,
      parsedCount: body.lines.length,
      status: "preview",
    });

    let imported = 0;
    let dup = 0;

    for (const line of selected) {
      if (line.externalId) {
        const exists = await Transaction.findOne({
          userId: user.userId,
          externalId: line.externalId,
          bankAccountId: body.bankAccountId,
        });
        if (exists) {
          dup += 1;
          continue;
        }
      }

      await Transaction.create({
        userId: user.userId,
        bankAccountId: body.bankAccountId,
        title: line.title,
        amount: line.amount,
        type: line.type,
        category: "Outro",
        status: "confirmed",
        occurredAt: line.occurredAt,
        externalId: line.externalId,
        importBatchId: batch._id,
        reconciled: false,
      });
      imported += 1;
    }

    await ImportBatch.updateOne(
      { _id: batch._id },
      {
        $set: {
          importedCount: imported,
          duplicateCount: dup,
          status: "imported",
        },
      },
    );

    const { recalculateAccountBalance } = await import("@/features/finance/lib/ledger");
    await recalculateAccountBalance(user.userId, body.bankAccountId);

    return created({ batchId: String(batch._id), imported, duplicates: dup });
  } catch (error) {
    return handleApiError(error);
  }
}
