import { addMonths } from "date-fns";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  assertCreditAccount,
  ensureInvoiceForDate,
  recalculateInvoiceTotal,
} from "@/features/finance/lib/creditCard";
import { recalculateAccountBalancesTouching } from "@/features/finance/lib/ledger";
import { created, fail, handleApiError } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { BankAccount } from "@/models/BankAccount";
import { InstallmentPlan } from "@/models/InstallmentPlan";
import { Transaction } from "@/models/Transaction";
import { z } from "zod";

const installmentSchema = z.object({
  bankAccountId: z.string().min(1),
  title: z.string().min(2),
  category: z.string().min(1),
  totalAmount: z.coerce.number().positive(),
  installments: z.coerce.number().int().min(2).max(120),
  firstChargeDate: z.coerce.date(),
  interestRate: z.coerce.number().min(0).optional(),
  notes: z.string().optional().default(""),
});

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const body = installmentSchema.parse(await request.json());
    const acc = await BankAccount.findOne({
      _id: body.bankAccountId,
      userId: user.userId,
      isArchived: false,
    });
    if (!acc) return fail("Conta não encontrada.", 404);

    const plan = await InstallmentPlan.create({
      userId: user.userId,
      bankAccountId: body.bankAccountId,
      title: body.title,
      category: body.category,
      totalAmount: body.totalAmount,
      installments: body.installments,
      firstChargeDate: body.firstChargeDate,
      interestRate: body.interestRate,
      notes: body.notes,
    });

    const piece = Math.round((body.totalAmount / body.installments) * 100) / 100;
    const remainder = body.totalAmount - piece * (body.installments - 1);

    for (let i = 0; i < body.installments; i += 1) {
      const chargeDate = addMonths(body.firstChargeDate, i);
      const amount = i === body.installments - 1 ? remainder : piece;

      let extra: Record<string, unknown> = {
        userId: user.userId,
        bankAccountId: body.bankAccountId,
        title: `${body.title} (${i + 1}/${body.installments})`,
        amount,
        type: "expense",
        category: body.category,
        status: "scheduled" as const,
        occurredAt: chargeDate,
        notes: body.notes,
        installmentPlanId: plan._id,
        installmentNumber: i + 1,
      };

      if (acc.type === "credit") {
        const creditAcc = await assertCreditAccount(user.userId, body.bankAccountId);
        const invoice = await ensureInvoiceForDate(
          user.userId,
          body.bankAccountId,
          {
            closingDay: creditAcc.closingDay ?? undefined,
            dueDay: creditAcc.dueDay ?? undefined,
          },
          chargeDate,
        );
        extra = {
          ...extra,
          paymentMethod: "credit",
          includeInAccountBalance: false,
          creditCardInvoiceId: invoice._id,
        };
      }

      const tx = await Transaction.create(extra);
      if (tx.creditCardInvoiceId) {
        await recalculateInvoiceTotal(String(tx.creditCardInvoiceId));
      }
    }

    await recalculateAccountBalancesTouching(user.userId, body.bankAccountId);
    return created(serializeDocument(plan));
  } catch (error) {
    return handleApiError(error);
  }
}
