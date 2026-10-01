import { Types } from "mongoose";
import { todayInTimezone } from "@/features/finance/domain/dates";
import { DEFAULT_TIMEZONE } from "@/features/finance/server/defaults";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { handleApiError } from "@/lib/http/api-response";
import { Account } from "@/models/Account";
import { Category } from "@/models/Category";
import { Recurring } from "@/models/Recurring";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";

const HIDDEN_FIELDS = "-__v -userId";

/** Backup completo do usuário em JSON (baixa como arquivo). */
export async function GET() {
  // Fora do try: sem sessão, o redirect para /login precisa propagar.
  const session = await requireCurrentUser();

  try {
    await connectToDatabase();
    const userId = new Types.ObjectId(session.userId);
    const [user, accounts, categories, recurrings, transactions] = await Promise.all([
      User.findById(userId).select("name email timezone cdiAnnualPct setupCompletedAt").lean<{ timezone?: string }>(),
      Account.find({ userId }).sort({ sortOrder: 1, createdAt: 1 }).select(HIDDEN_FIELDS).lean(),
      Category.find({ userId }).sort({ kind: 1, sortOrder: 1 }).select(HIDDEN_FIELDS).lean(),
      Recurring.find({ userId }).sort({ dayOfMonth: 1 }).select(HIDDEN_FIELDS).lean(),
      Transaction.find({ userId }).sort({ date: -1, createdAt: -1 }).select(HIDDEN_FIELDS).lean(),
    ]);

    // Data no fuso do usuário: à noite, o UTC já seria o dia seguinte.
    const date = todayInTimezone(user?.timezone ?? DEFAULT_TIMEZONE);
    const body = JSON.stringify(
      { exportedAt: new Date().toISOString(), user, accounts, categories, recurrings, transactions },
      null,
      2,
    );

    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="second-brain-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
