import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { Investment } from "@/models/Investment";

const schema = z.object({
  bankAccountId: z.string().min(1),
  name: z.string().min(2),
  assetClass: z
    .enum(["fixed-income", "stocks", "crypto", "funds", "other"])
    .default("other"),
  purchaseDate: z.coerce.date(),
  principal: z.coerce.number().min(0),
  currentValue: z.coerce.number().min(0),
  expectedRateAnnual: z.coerce.number().min(0).optional(),
  maturityDate: z.coerce.date().optional(),
  liquidity: z.enum(["daily", "30d", "until-maturity"]).optional(),
  notes: z.string().optional().default(""),
});

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const list = await Investment.find({ userId: user.userId }).sort({ purchaseDate: -1 });
    return ok(serializeDocuments(list));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const body = schema.parse(await request.json());
    const doc = await Investment.create({ ...body, userId: user.userId });
    return created(serializeDocument(doc));
  } catch (error) {
    return handleApiError(error);
  }
}
