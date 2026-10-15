import { z } from "zod";

export const boardIdParamsSchema = z.object({
  boardId: z.coerce.number().int().positive(),
});

export const createBoardSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const updateBoardSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
