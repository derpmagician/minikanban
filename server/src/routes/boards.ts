import type { FastifyInstance } from "fastify";
import { db } from "../prisma/db.js";
import { getBoardAccess } from "../utils/board-access.js";

export async function boardRoutes(app: FastifyInstance) {

  app.post("/", { onRequest: [app.authenticate], }, async (request, reply) => {
      const body = request.body as {
        name: string;
      };

      const userId = request.user.userId;

      const board = await db.orm.public.Board.create({
        name: body.name,
        ownerId: userId,
      });

      return reply.code(201).send(board);

    },
  );

  app.get("/", { onRequest: [app.authenticate], }, async (request) => {
    const userId = request.user.userId;

    // 1. Boards donde el usuario es propietario
    const ownedBoards = await db.orm.public.Board
      .where({
        ownerId: userId,
      })
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

    },
  );

  app.get("/:boardId", { onRequest: [app.authenticate], }, async (request, reply) => {
    const { boardId } = request.params as {
      boardId: string;
    };

    const id = Number(boardId);

    if (!Number.isInteger(id)) {
      return reply.code(400).send({
        error: "Invalid board id",
      });
    }

    const userId = request.user.userId;

    const access = await getBoardAccess(id, userId);

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    return access.board;

  },);

  app.get("/:boardId/full", { onRequest: [app.authenticate], }, async (request, reply) => {

    const { boardId } = request.params as {
      boardId: string;
    };

    const id = Number(boardId);

    if (!Number.isInteger(id)) {
      return reply.code(400).send({
        error: "Invalid board id",
      });
    }

    const userId = request.user.userId;

    const access =
      await getBoardAccess(id, userId);

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    const members = await db.orm.public.BoardMember
      .where({
        boardId: id,
      })
      .all();

    const columns = await db.orm.public.BoardColumn
      .where({
        boardId: id,
      })
      .all();

    const columnsWithCards = await Promise.all(
      columns.map(async (column) => {

        const cards =
          await db.orm.public.Card
            .where({
              columnId: column.id,
            })
            .all();

        return {
          ...column,
          cards,
        };
      }),
    );

    return {
      ...access.board,
      members,
      columns: columnsWithCards,
    };

    },
  );


  app.put("/:boardId", { onRequest: [app.authenticate], }, async (request, reply) => {

    const { boardId } = request.params as {
      boardId: string;
    };

    const id = Number(boardId);

    if (!Number.isInteger(id)) {
      return reply.code(400).send({
        error: "Invalid board id",
      });
    }

    const userId = request.user.userId;

    const access = await getBoardAccess(id, userId);

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    const body = request.body as {
      name: string;
    };

    const updated = await db.orm.public.Board
      .where({
        id,
      })
      .update({
        name: body.name,
      });

    return updated;

  },);

  app.delete("/:boardId", { onRequest: [app.authenticate], }, async (request, reply) => {

    const { boardId } = request.params as {
      boardId: string;
    };

    const id = Number(boardId);

    if (!Number.isInteger(id)) {
      return reply.code(400).send({
        error: "Invalid board id",
      });
    }

    const userId = request.user.userId;

    const access = await getBoardAccess(id, userId);

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    await db.orm.public.Board
      .where({
        id,
      })
      .delete();

    return {
      success: true,
    };

    },
  );

}