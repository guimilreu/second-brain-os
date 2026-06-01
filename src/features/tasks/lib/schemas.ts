import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(""),
  color: z.string().default("#ffc100"),
  icon: z.string().default("FolderKanban"),
  linkedSavingsPotId: z.string().optional(),
});

export const sprintSchema = z.object({
  title: z.string().min(2),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  intention: z.string().optional().default(""),
  status: z.enum(["planned", "active", "completed"]).default("active"),
});

const taskLinkFields = {
  estimatedCost: z.coerce.number().min(0).optional(),
  relatedWishlistItemId: z.string().optional(),
  relatedGoalId: z.string().optional(),
  relatedSavingsPotId: z.string().optional(),
  relatedNoteId: z.string().optional(),
};

export const taskSchema = z.object({
  projectId: z.string().optional(),
  sprintId: z.string().optional(),
  title: z.string().min(2),
  description: z.string().optional().default(""),
  status: z.enum(["todo", "doing", "done", "blocked"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  plannedFor: z.coerce.date().optional(),
  ...taskLinkFields,
});

export const taskPatchSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "doing", "done", "blocked"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  projectId: z.string().optional(),
  sprintId: z.string().optional(),
  plannedFor: z.coerce.date().optional(),
  ...taskLinkFields,
});

export const updateTaskSchema = z.object({
  id: z.string().min(1),
  updates: taskPatchSchema,
});
