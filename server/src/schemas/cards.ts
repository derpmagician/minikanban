import { z } from "zod";

export const cardIdParamsSchema = z.object({
  cardId: z.coerce.number().int().positive(),
});

export const createCardSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullish(),
  position: z.number().int().min(0),
  priority: z.enum(["low", "medium", "high"]).optional(),
  columnId: z.number().int().positive(),
  assigneeId: z.number().int().positive().nullish(),
  dueDate: z.iso.datetime({ offset: true }).nullish(),
});

export const updateCardSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullish(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.iso.datetime({ offset: true }).nullish(),
});

export const moveCardSchema = z.object({
  columnId: z.number().int().positive(),
  position: z.number().int().min(0),
});
