import { z } from "zod";

export const memberIdParamsSchema = z.object({
  memberId: z.coerce.number().int().positive(),
});

export const addMemberSchema = z.object({
  userId: z.number().int().positive(),
  boardId: z.number().int().positive(),
  role: z.enum(["admin", "member"]).optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});
