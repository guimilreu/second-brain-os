import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { assertCreditAccount } from "@/features/finance/lib/creditCard";
import { executeTransfer, TransferError } from "@/features/finance/lib/transfers";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { CreditCardInvoice } from "@/models/CreditCardInvoice";

const paySchema = z.object({
  fromAccountId: z.string().min(1),
  amount: z.coerce.number().positive(),
  occurredAt: z.coerce.date().optional(),
  notes: z.string().optional().default(""),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; invoiceId: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { accountId, invoiceId } = await params;
    await connectToDatabase();
    await assertCreditAccount(user.userId, accountId);

    const invoice = await CreditCardInvoice.findOne({
      _id: invoiceId,
      userId: user.userId,
      bankAccountId: accountId,
    });
    if (!invoice) return fail("Fatura não encontrada.", 404);

    const body = paySchema.parse(await request.json());
    const result = await executeTransfer(user.userId, {
      kind: "invoice-payment",
      fromAccountId: body.fromAccountId,
      creditCardInvoiceId: invoiceId,
      amount: body.amount,
      fee: 0,
      occurredAt: body.occurredAt ?? new Date(),
      notes: body.notes,
      status: "confirmed",
    });
    return ok(serializeDocument(result.transfer));
  } catch (error) {
    if (error instanceof TransferError) {
      return fail(error.message, error.status);
    }
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("não encontrado") || msg.includes("Configure")) {
      return fail(msg, 404);
    }
    return handleApiError(error);
  }
}
