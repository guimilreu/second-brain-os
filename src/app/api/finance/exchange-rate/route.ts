import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { handleApiError, ok } from "@/lib/http/api-response";
import { ExchangeRate } from "@/models/ExchangeRate";

/** Placeholder: sem rede em ambiente local — persiste 5.5 se não existir. */
export async function GET() {
  try {
    await requireCurrentUser();
    await connectToDatabase();
    const row = await ExchangeRate.findOne({ base: "USD", quote: "BRL" });
    if (row) return ok({ base: row.base, quote: row.quote, rate: row.rate, fetchedAt: row.fetchedAt });
    const created = await ExchangeRate.create({
      base: "USD",
      quote: "BRL",
      rate: 5.5,
      fetchedAt: new Date(),
    });
    return ok({ base: created.base, quote: created.quote, rate: created.rate, fetchedAt: created.fetchedAt });
  } catch (error) {
    return handleApiError(error);
  }
}
