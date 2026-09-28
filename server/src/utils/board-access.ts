import { db } from "../prisma/db.js";

export async function getBoardAccess(
  boardId: number,
  userId: number,
) {
  const board =
    await db.orm.public.Board
      .where({
        id: boardId,
      })
      .first();

  if (!board) {
    return null;
  }

  if (board.ownerId === userId) {
    return {
      board,
      role: "owner" as const,
    };
  }

  const member =
    await db.orm.public.BoardMember
      .where({
        boardId,
        userId,
      })
      .first();

  if (!member) {
    return null;
  }

  return {
    board,
    role: member.role,
  };
}