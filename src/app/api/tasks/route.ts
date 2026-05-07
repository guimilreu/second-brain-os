import { taskSchema, updateTaskSchema } from "@/features/tasks/lib/schemas";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { Task } from "@/models/Task";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const tasks = await Task.find({ userId: user.userId })
      .populate("projectId")
      .sort({ plannedFor: 1, createdAt: -1 })
      .limit(200);

    return ok(serializeDocuments(tasks));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const payload = taskSchema.parse(await request.json());
    const task = await Task.create({ ...payload, userId: user.userId });

    return created(serializeDocument(task));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const payload = updateTaskSchema.parse(await request.json());
    const updates = {
      ...payload.updates,
      completedAt: payload.updates.status === "done" ? new Date() : undefined,
    };

    const task = await Task.findOneAndUpdate(
      { _id: payload.id, userId: user.userId },
      { $set: updates },
      { new: true },
    );

    if (!task) {
      return fail("Tarefa não encontrada.", 404);
    }

    return ok(serializeDocument(task));
  } catch (error) {
    return handleApiError(error);
  }
}
