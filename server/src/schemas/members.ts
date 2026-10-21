import { z } from "zod";

export const memberIdParamsSchema = z.object({
  memberId: z.coerce.number().int().positive(),
});

export const addMemberSchema = z
  .object({
    userId: z.number().int().positive().optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    username: z.string().trim().toLowerCase().min(3).max(30).optional(),
    boardId: z.number().int().positive(),
    role: z.enum(["admin", "member"]).optional(),
  })
  .refine(
    (data) =>
      data.userId !== undefined ||
      data.email !== undefined ||
      data.username !== undefined,
    {
      message: "Indica userId, email o username",
      path: ["userId"],
    },
  );

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});
