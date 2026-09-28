import { db } from "../prisma/db.js";

export type BoardRole =
  | "owner"
  | "admin"
  | "member";

export async function getBoardAccess( boardId: number, userId: number, ) {
  const board = await db.orm.public.Board
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

  const membership = await db.orm.public.BoardMember
		.where({
			boardId,
			userId,
		})
		.first();

  if (!membership) {
    return null;
  }

  return {
    board,
    role: membership.role as BoardRole,
  };

}

export async function requireBoardRole( boardId: number, userId: number, roles: BoardRole[], ) {
  const access = await getBoardAccess(
		boardId,
		userId,
	);

  if (!access) {
    return null;
  }

  if (roles.includes(access.role)) {
    return access;
  }

  return false;

}

export async function requireBoardAdmin( boardId: number, userId: number, ) {
  return requireBoardRole(
    boardId,
    userId,
    ["owner", "admin"],
  );

}