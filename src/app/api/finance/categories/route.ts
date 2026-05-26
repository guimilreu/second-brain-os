import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { categoryCreateSchema } from "@/features/finance/lib/schemas";
import { slugify } from "@/lib/finance/seed-categories";
import { created, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { Category } from "@/models/Category";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const list = await Category.find({ userId: user.userId, isArchived: false }).sort({
      displayOrder: 1,
      name: 1,
    });
    return ok(serializeDocuments(list));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const body = categoryCreateSchema.parse(await request.json());
    const slug = body.slug ?? slugify(body.name);
    const doc = await Category.create({
      ...body,
      slug,
      userId: user.userId,
    });
    return created(serializeDocument(doc));
  } catch (error) {
    return handleApiError(error);
  }
}
