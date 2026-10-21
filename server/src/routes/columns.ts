import type { FastifyInstance } from "fastify";
import type { z } from "zod";
import { db } from "../prisma/db.js";
import {
  getBoardAccess,
  getBoardById,
  requireBoardAdmin,
} from "../utils/board-access.js";
import { boardIdParamsSchema } from "../schemas/boards.js";
import {
  columnIdParamsSchema,
  createColumnSchema,
  updateColumnSchema,
} from "../schemas/columns.js";
import {
  clampIndex,
  rewriteColumnPositions,
  sortByPosition,
} from "../utils/positions.js";

export async function columnRoutes(app: FastifyInstance) {

  // =========================================================
  // CREATE COLUMN
  // POST /api/columns
  // =========================================================

  app.post("/", {
    onRequest: [app.authenticate],
    schema: {
      body: createColumnSchema,
    },
  }, async (request, reply) => {
    const body =
      request.body as z.infer<typeof createColumnSchema>;

    const userId = request.user.userId;

    const board = await getBoardById(body.boardId);

    if (!board) {
      return reply.code(404).send({
        error: "Board not found",
      });
    }

    const access = await getBoardAccess(
      body.boardId,
      userId,
    );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    // Insertar la columna en la posición pedida (limitada al total)
    // y desplazar el resto del board para dejar hueco.
    const column = await db.transaction(async (tx) => {
      const columns = sortByPosition(
        await tx.orm.public.BoardColumn
          .where({
            boardId: body.boardId,
          })
          .all(),
      );

      const position = clampIndex(
        body.position,
        columns.length,
      );

      await rewriteColumnPositions(
        tx,
        columns,
        position,
        1,
      );

      return await tx.orm.public.BoardColumn.create({
        name: body.name,
        position,
        boardId: body.boardId,
      });
    });

    return reply.code(201).send(column);
  });

  // =========================================================
  // LIST COLUMNS
  // GET /api/columns/board/:boardId
  // =========================================================

  app.get("/board/:boardId", {
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

    const columns = await db.orm.public.BoardColumn
      .where({
        boardId,
      })
      .orderBy([
        (column) => column.position.asc(),
        (column) => column.id.asc(),
      ])
      .all();

    return columns;
  });

  // =========================================================
  // UPDATE COLUMN
  // PUT /api/columns/:columnId
  // =========================================================

  app.put("/:columnId", {
    onRequest: [app.authenticate],
    schema: {
      params: columnIdParamsSchema,
      body: updateColumnSchema,
    },
  }, async (request, reply) => {
    const { columnId } =
      request.params as z.infer<typeof columnIdParamsSchema>;

    const body =
      request.body as z.infer<typeof updateColumnSchema>;

    const column = await db.orm.public.BoardColumn
      .where({
        id: columnId,
      })
      .first();

    if (!column) {
      return reply.code(404).send({
        error: "Column not found",
      });
    }

    const userId = request.user.userId;

    const access = await getBoardAccess(
      column.boardId,
      userId,
    );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    // Renombrar y, si cambia la posición, reordenar el board.
    const updated = await db.transaction(async (tx) => {
      const columns = sortByPosition(
        await tx.orm.public.BoardColumn
          .where({
            boardId: column.boardId,
          })
          .all(),
      ).filter((row) => row.id !== column.id);

      const position = clampIndex(
        body.position,
        columns.length,
      );

      columns.splice(position, 0, column);

      await rewriteColumnPositions(tx, columns);

      return await tx.orm.public.BoardColumn
        .where({
          id: columnId,
        })
        .update({
          name: body.name,
        });
    });

    return updated;
  });

  // =========================================================
  // DELETE COLUMN
  // DELETE /api/columns/:columnId
  // Solo owner o admin
  // =========================================================

  app.delete("/:columnId", {
    onRequest: [app.authenticate],
    schema: {
      params: columnIdParamsSchema,
    },
  }, async (request, reply) => {
    const { columnId } =
      request.params as z.infer<typeof columnIdParamsSchema>;

    const column = await db.orm.public.BoardColumn
      .where({
        id: columnId,
      })
      .first();

    if (!column) {
      return reply.code(404).send({
        error: "Column not found",
      });
    }

    const userId = request.user.userId;

    const access = await requireBoardAdmin(
      column.boardId,
      userId,
    );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    // Eliminar y compactar las posiciones restantes del board
    await db.transaction(async (tx) => {
      const columns = sortByPosition(
        await tx.orm.public.BoardColumn
          .where({
            boardId: column.boardId,
          })
          .all(),
      );

      const index = columns.findIndex(
        (row) => row.id === column.id,
      );

      await tx.orm.public.BoardColumn
        .where({
          id: columnId,
        })
        .delete();

      if (index !== -1) {
        await rewriteColumnPositions(
          tx,
          columns,
          index + 1,
          -1,
        );
      }
    });

    return {
      success: true,
    };
  });

}
