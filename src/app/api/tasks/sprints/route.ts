import { sprintSchema } from "@/features/tasks/lib/schemas";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { WeeklySprint } from "@/models/WeeklySprint";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const sprints = await WeeklySprint.find({ userId: user.userId })
      .sort({ startsAt: -1 })
      .limit(20);

    return ok(serializeDocuments(sprints));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const payload = sprintSchema.parse(await request.json());
    const sprint = await WeeklySprint.create({ ...payload, userId: user.userId });

    return created(serializeDocument(sprint));
  } catch (error) {
    return handleApiError(error);
  }
}
