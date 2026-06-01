import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { executeTransfer, TransferError } from "@/features/finance/lib/transfers";
import { created, fail, handleApiError } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { Investment } from "@/models/Investment";
import { InvestmentMovement } from "@/models/InvestmentMovement";
import { z } from "zod";

const movementSchema = z.object({
  kind: z.enum(["deposit", "withdraw"]),
  amount: z.coerce.number().positive(),
  counterAccountId: z.string().min(1),
  occurredAt: z.coerce.date().optional(),
  notes: z.string().optional().default(""),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();
    const body = movementSchema.parse(await request.json());
    const investment = await Investment.findOne({ _id: id, userId: user.userId });
    if (!investment) return fail("Investimento não encontrado.", 404);

    const investmentAccountId = String(investment.bankAccountId);
    const occurredAt = body.occurredAt ?? new Date();
    const transferKind =
      body.kind === "deposit" ? "investment-deposit" : "investment-withdraw";

    try {
      if (body.kind === "deposit") {
        await executeTransfer(user.userId, {
          kind: transferKind,
          fromAccountId: body.counterAccountId,
          toAccountId: investmentAccountId,
          amount: body.amount,
          fee: 0,
          occurredAt,
          notes: body.notes,
          status: "confirmed",
        });
      } else {
        await executeTransfer(user.userId, {
          kind: transferKind,
          fromAccountId: investmentAccountId,
          toAccountId: body.counterAccountId,
          amount: body.amount,
          fee: 0,
          occurredAt,
          notes: body.notes,
          status: "confirmed",
        });
      }
    } catch (error) {
      if (error instanceof TransferError) {
        return fail(error.message, error.status);
      }
      throw error;
    }

    const delta = body.kind === "deposit" ? body.amount : -body.amount;
    const nextValue = Math.max(0, Number(investment.currentValue) + delta);

    await Investment.updateOne({ _id: id }, { $set: { currentValue: nextValue } });

    const movement = await InvestmentMovement.create({
      userId: user.userId,
      investmentId: id,
      kind: body.kind,
      amount: body.amount,
      occurredAt,
      notes: body.notes,
    });

    return created(serializeDocument(movement));
  } catch (error) {
    return handleApiError(error);
  }
}
