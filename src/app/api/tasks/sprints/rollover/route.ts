import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { Task } from "@/models/Task";
import { WeeklySprint } from "@/models/WeeklySprint";

const rolloverSchema = z.object({
  targetSprintId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const { targetSprintId } = rolloverSchema.parse(await request.json());
    const targetSprint = await WeeklySprint.findOne({
      _id: targetSprintId,
      userId: user.userId,
    });

    if (!targetSprint) {
      return fail("Sprint de destino não encontrada.", 404);
    }

    const previousSprint = await WeeklySprint.findOne({
      userId: user.userId,
      endsAt: { $lt: targetSprint.startsAt },
    }).sort({ endsAt: -1 });

    if (!previousSprint) {
      return ok({ moved: 0 });
    }

    const result = await Task.updateMany(
      {
        userId: user.userId,
        sprintId: previousSprint._id,
        status: { $ne: "done" },
      },
      { $set: { sprintId: targetSprint._id } },
    );

    return ok({ moved: result.modifiedCount });
  } catch (error) {
    return handleApiError(error);
  }
}
