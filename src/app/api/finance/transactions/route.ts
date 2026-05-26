import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  assertCreditAccount,
  ensureInvoiceForDate,
  recalculateInvoiceTotal,
} from "@/features/finance/lib/creditCard";
import { recalculateAccountBalancesTouching } from "@/features/finance/lib/ledger";
import { transactionSchema } from "@/features/finance/lib/schemas";
import { created, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { BankAccount } from "@/models/BankAccount";
import { Transaction } from "@/models/Transaction";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const transactions = await Transaction.find({ userId: user.userId })
      .sort({ occurredAt: -1 })
      .limit(500);

    return ok(serializeDocuments(transactions));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const payload = transactionSchema.parse(await request.json());
    const doc: Record<string, unknown> = { ...payload, userId: user.userId };

    if (payload.bankAccountId) {
      const acc = await BankAccount.findOne({
        _id: payload.bankAccountId,
        userId: user.userId,
        isArchived: false,
      });
      if (acc?.type === "credit" && payload.type === "expense") {
        const creditAcc = await assertCreditAccount(user.userId, payload.bankAccountId);
        const invoice = await ensureInvoiceForDate(
          user.userId,
          payload.bankAccountId,
          {
            closingDay: creditAcc.closingDay ?? undefined,
            dueDay: creditAcc.dueDay ?? undefined,
          },
          payload.occurredAt,
        );
        doc.paymentMethod = "credit";
        doc.includeInAccountBalance = false;
        doc.creditCardInvoiceId = invoice._id;
      }
    }

    const transaction = await Transaction.create(doc);
    if (transaction.creditCardInvoiceId) {
      await recalculateInvoiceTotal(String(transaction.creditCardInvoiceId));
    }
    await recalculateAccountBalancesTouching(user.userId, payload.bankAccountId ?? null);

    return created(serializeDocument(transaction));
  } catch (error) {
    return handleApiError(error);
  }
}
