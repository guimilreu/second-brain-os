import { z } from "zod";

export const wishlistLaneSchema = z.enum(["dream", "planned", "archive"]);
export const wishlistStatusSchema = z.enum([
  "idea",
  "researching",
  "ready",
  "purchased",
  "cancelled",
]);

export const wishlistItemCreateSchema = z.object({
  title: z.string().min(2),
  notes: z.string().optional().default(""),
  url: z.string().optional().default(""),
  category: z.string().min(1),
  lane: wishlistLaneSchema.default("dream"),
  plannedMonthKey: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
  sortOrder: z.coerce.number().optional().default(0),
  status: wishlistStatusSchema.default("idea"),
  estimatedPrice: z.coerce.number().min(0).default(0),
  actualPrice: z.coerce.number().min(0).optional(),
  purchasedAt: z.coerce.date().optional(),
});

export const wishlistItemPatchSchema = wishlistItemCreateSchema.partial();

export const wishlistMonthBudgetSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  capAmount: z.coerce.number().min(0),
});
