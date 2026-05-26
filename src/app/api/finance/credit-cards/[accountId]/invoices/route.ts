import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { assertCreditAccount } from "@/features/finance/lib/creditCard";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocuments } from "@/lib/utils/serialize";
import { CreditCardInvoice } from "@/models/CreditCardInvoice";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { accountId } = await params;
    await connectToDatabase();
    await assertCreditAccount(user.userId, accountId);
    const invoices = await CreditCardInvoice.find({ userId: user.userId, bankAccountId: accountId })
      .sort({ cycleEnd: -1 })
      .limit(24);
    return ok(serializeDocuments(invoices));
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro.";
    if (msg.includes("não encontrado") || msg.includes("Configure")) {
      return fail(msg, 404);
    }
    return handleApiError(error);
  }
}
