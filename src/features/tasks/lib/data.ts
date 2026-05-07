import { endOfWeek, startOfWeek } from "date-fns";
import { connectToDatabase } from "@/lib/db/mongodb";
import { serializeDocuments } from "@/lib/utils/serialize";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { WeeklySprint } from "@/models/WeeklySprint";

export async function getTasksOverview(userId: string) {
  await connectToDatabase();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  let sprint = await WeeklySprint.findOne({
    userId,
    startsAt: { $lte: weekEnd },
    endsAt: { $gte: weekStart },
  });

  if (!sprint) {
    sprint = await WeeklySprint.create({
      userId,
      title: "Sprint da semana",
      startsAt: weekStart,
      endsAt: weekEnd,
      intention: "Transformar a semana em execução clara.",
      status: "active",
    });
  }

  const [projects, tasks] = await Promise.all([
    Project.find({ userId, isArchived: false }).sort({ name: 1 }),
    Task.find({ userId, sprintId: sprint._id })
      .populate("projectId")
      .sort({ status: 1, plannedFor: 1, createdAt: -1 }),
  ]);

  return {
    sprint: serializeDocuments([sprint])[0],
    projects: serializeDocuments(projects),
    tasks: serializeDocuments(tasks),
  };
}
