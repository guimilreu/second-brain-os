import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(""),
  color: z.string().default("#ffc100"),
  icon: z.string().default("FolderKanban"),
});

export const sprintSchema = z.object({
  title: z.string().min(2),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  intention: z.string().optional().default(""),
  status: z.enum(["planned", "active", "completed"]).default("active"),
});

export const taskSchema = z.object({
  projectId: z.string().optional(),
  sprintId: z.string().optional(),
  title: z.string().min(2),
  description: z.string().optional().default(""),
  status: z.enum(["todo", "doing", "done", "blocked"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  plannedFor: z.coerce.date().optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().min(1),
  updates: z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    status: z.enum(["todo", "doing", "done", "blocked"]).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    projectId: z.string().optional(),
    sprintId: z.string().optional(),
    plannedFor: z.coerce.date().optional(),
  }),
});
