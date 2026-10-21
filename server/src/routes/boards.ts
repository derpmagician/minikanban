import type { FastifyInstance } from "fastify";
import type { z } from "zod";
import { db } from "../prisma/db.js";
import {
  getBoardAccess,
  getBoardById,
  requireBoardRole,
} from "../utils/board-access.js";
import {
  boardIdParamsSchema,
  createBoardSchema,
  updateBoardSchema,
} from "../schemas/boards.js";
import {
  toPublicUser,
  withPublicUsers,
} from "../utils/public-user.js";

export async function boardRoutes(app: FastifyInstance) {

  // =========================================================
  // CREATE BOARD
  // POST /api/boards
  // =========================================================

  app.post("/", {
    onRequest: [app.authenticate],
    schema: {
      body: createBoardSchema,
    },
  }, async (request, reply) => {
    const body =
      request.body as z.infer<typeof createBoardSchema>;

    const userId = request.user.userId;

    const board = await db.orm.public.Board.create({
      name: body.name,
      ownerId: userId,
    });

    return reply.code(201).send(board);
  });

  // =========================================================
  // LIST BOARDS
  // GET /api/boards
  // =========================================================

  app.get("/", {
    onRequest: [app.authenticate],
  }, async (request) => {
    const userId = request.user.userId;

    // 1. Boards donde el usuario es propietario
    const ownedBoards = await db.orm.public.Board
      .where({
        ownerId: userId,
      })
      .orderBy((board) => board.createdAt.asc())
      .all();

    // 2. Membresías del usuario
    const memberships = await db.orm.public.BoardMember
      .where({
        userId,
      })
      .all();

    // 3. Obtener los boards de esas membresías
    const memberBoards = await Promise.all(
      memberships.map(async (membership) => {
        return await db.orm.public.Board
          .where({
            id: membership.boardId,
          })
          .first();
      }),
    );

    // 4. Eliminar posibles valores null
    const validMemberBoards = memberBoards.filter(
      (board): board is NonNullable<typeof board> =>
        board !== null,
    );

    // 5. Combinar ambos grupos
    const allBoards = [
      ...ownedBoards,
      ...validMemberBoards,
    ];

    // 6. Eliminar duplicados por id
    const uniqueBoards = Array.from(
      new Map(
        allBoards.map((board) => [board.id, board]),
      ).values(),
    );

    return uniqueBoards;
  });

  // =========================================================
  // GET BOARD
  // GET /api/boards/:boardId
  // =========================================================

  app.get("/:boardId", {
    onRequest: [app.authenticate],
    schema: {
      params: boardIdParamsSchema,
    },
  }, async (request, reply) => {
    const { boardId } =
      request.params as z.infer<typeof boardIdParamsSchema>;

    const userId = request.user.userId;

    const board = await getBoardById(boardId);

    if (!board) {
      return reply.code(404).send({
        error: "Board not found",
      });
    }

    const access = await getBoardAccess(boardId, userId);

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    return access.board;
  });

  // =========================================================
  // GET BOARD FULL
  // GET /api/boards/:boardId/full
  // =========================================================

  app.get("/:boardId/full", {
    onRequest: [app.authenticate],
    schema: {
      params: boardIdParamsSchema,
    },
  }, async (request, reply) => {
    const { boardId } =
      request.params as z.infer<typeof boardIdParamsSchema>;

    const userId = request.user.userId;

    const board = await getBoardById(boardId);

    if (!board) {
      return reply.code(404).send({
        error: "Board not found",
      });
    }

    const access = await getBoardAccess(boardId, userId);

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    const members = await db.orm.public.BoardMember
      .where({
        boardId,
      })
      .orderBy((member) => member.id.asc())
      .all();

    const owner = await db.orm.public.User
      .where({
        id: access.board.ownerId,
      })
      .first();

    const columns = await db.orm.public.BoardColumn
      .where({
        boardId,
      })
      .orderBy([
        (column) => column.position.asc(),
        (column) => column.id.asc(),
      ])
      .all();

    const columnsWithCards = await Promise.all(
      columns.map(async (column) => {
        const cards = await db.orm.public.Card
          .where({
            columnId: column.id,
          })
          .orderBy([
            (card) => card.position.asc(),
            (card) => card.id.asc(),
          ])
          .all();

        return {
          ...column,
          cards,
        };
      }),
    );

    return {
      ...access.board,
      owner: owner ? toPublicUser(owner) : null,
      members: await withPublicUsers(members),
      columns: columnsWithCards,
    };
  });

  // =========================================================
  // UPDATE BOARD
  // PUT /api/boards/:boardId
  // Solo owner o admin pueden renombrar el board
  // =========================================================

  app.put("/:boardId", {
    onRequest: [app.authenticate],
    schema: {
      params: boardIdParamsSchema,
      body: updateBoardSchema,
    },
  }, async (request, reply) => {
    const { boardId } =
      request.params as z.infer<typeof boardIdParamsSchema>;

    const body =
      request.body as z.infer<typeof updateBoardSchema>;

    const userId = request.user.userId;

    const board = await getBoardById(boardId);

    if (!board) {
      return reply.code(404).send({
        error: "Board not found",
      });
    }

    const access = await requireBoardRole(
      boardId,
      userId,
      ["owner", "admin"],
    );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    const updated = await db.orm.public.Board
      .where({
        id: boardId,
      })
      .update({
        name: body.name,
      });

    return updated;
  });

  // =========================================================
  // DELETE BOARD
  // DELETE /api/boards/:boardId
  // Solo el owner puede eliminar el board
  // =========================================================

  app.delete("/:boardId", {
    onRequest: [app.authenticate],
    schema: {
      params: boardIdParamsSchema,
    },
  }, async (request, reply) => {
    const { boardId } =
      request.params as z.infer<typeof boardIdParamsSchema>;

    const userId = request.user.userId;

    const board = await getBoardById(boardId);

    if (!board) {
      return reply.code(404).send({
        error: "Board not found",
      });
    }

    const access = await requireBoardRole(
      boardId,
      userId,
      ["owner"],
    );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    await db.orm.public.Board
      .where({
        id: boardId,
      })
      .delete();

    return {
      success: true,
    };
  });

}
