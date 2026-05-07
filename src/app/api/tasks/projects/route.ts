import { projectSchema } from "@/features/tasks/lib/schemas";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { Project } from "@/models/Project";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const projects = await Project.find({
      userId: user.userId,
      isArchived: false,
    }).sort({ name: 1 });

    return ok(serializeDocuments(projects));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const payload = projectSchema.parse(await request.json());
    const project = await Project.create({ ...payload, userId: user.userId });

    return created(serializeDocument(project));
  } catch (error) {
    return handleApiError(error);
  }
}
