import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  assertCreditAccount,
  ensureInvoiceForDate,
  recalculateInvoiceTotal,
} from "@/features/finance/lib/creditCard";
import { recalculateAccountBalancesTouching } from "@/features/finance/lib/ledger";
import { transactionPatchSchema } from "@/features/finance/lib/schemas";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { BankAccount } from "@/models/BankAccount";
import { Transaction } from "@/models/Transaction";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();

    const patch = transactionPatchSchema.parse(await request.json());
    const existing = await Transaction.findOne({ _id: id, userId: user.userId });
    if (!existing) return fail("Transação não encontrada.", 404);

    const oldInvoice = existing.creditCardInvoiceId
      ? String(existing.creditCardInvoiceId)
      : null;
    const prevAccount = existing.bankAccountId ? String(existing.bankAccountId) : null;

    const merged = {
      ...existing.toObject(),
      ...patch,
      occurredAt: patch.occurredAt ?? existing.occurredAt,
    };

    let updates: Record<string, unknown> = patch;

    const bankAccountId = (patch.bankAccountId ?? existing.bankAccountId)?.toString();
    if (bankAccountId && merged.type === "expense") {
      const acc = await BankAccount.findOne({
        _id: bankAccountId,
        userId: user.userId,
        isArchived: false,
      });
      if (acc?.type === "credit") {
        const creditAcc = await assertCreditAccount(user.userId, bankAccountId);
        const invoice = await ensureInvoiceForDate(
          user.userId,
          bankAccountId,
          {
            closingDay: creditAcc.closingDay ?? undefined,
            dueDay: creditAcc.dueDay ?? undefined,
          },
          merged.occurredAt as Date,
        );
        updates = {
          ...updates,
          paymentMethod: "credit",
          includeInAccountBalance: false,
          creditCardInvoiceId: invoice._id,
        };
      } else if (acc && merged.type === "expense") {
        updates = {
          ...updates,
          includeInAccountBalance: true,
          creditCardInvoiceId: null,
        };
      }
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: updates },
      { returnDocument: "after" },
    );

    if (!transaction) return fail("Transação não encontrada.", 404);

    for (const invId of new Set(
      [oldInvoice, transaction.creditCardInvoiceId ? String(transaction.creditCardInvoiceId) : null].filter(
        Boolean,
      ) as string[],
    )) {
      await recalculateInvoiceTotal(invId);
    }

    await recalculateAccountBalancesTouching(
      user.userId,
      transaction.bankAccountId ? String(transaction.bankAccountId) : null,
      prevAccount,
    );

    return ok(serializeDocument(transaction));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();

    const transaction = await Transaction.findOneAndDelete({ _id: id, userId: user.userId });

    if (transaction?.creditCardInvoiceId) {
      await recalculateInvoiceTotal(String(transaction.creditCardInvoiceId));
    }
    if (transaction?.bankAccountId) {
      await recalculateAccountBalancesTouching(
        user.userId,
        String(transaction.bankAccountId),
      );
    }

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
