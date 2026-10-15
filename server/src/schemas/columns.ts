import { z } from "zod";

export const columnIdParamsSchema = z.object({
  columnId: z.coerce.number().int().positive(),
});

export const createColumnSchema = z.object({
  name: z.string().trim().min(1).max(100),
  position: z.number().int().min(0),
  boardId: z.number().int().positive(),
});

export const updateColumnSchema = z.object({
  name: z.string().trim().min(1).max(100),
  position: z.number().int().min(0),
});
