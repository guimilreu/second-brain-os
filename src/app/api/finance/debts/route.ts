import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { Debt } from "@/models/Debt";

const schema = z.object({
  name: z.string().min(2),
  creditor: z.string().optional().default(""),
  principal: z.coerce.number().min(0),
  interestRateMonthly: z.coerce.number().min(0).default(0),
  installments: z.coerce.number().int().min(1),
  startsAt: z.coerce.date(),
  bankAccountId: z.string().optional(),
  notes: z.string().optional().default(""),
});

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const list = await Debt.find({ userId: user.userId }).sort({ startsAt: -1 });
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
    const doc = await Debt.create({ ...body, userId: user.userId });
    return created(serializeDocument(doc));
  } catch (error) {
    return handleApiError(error);
  }
}
