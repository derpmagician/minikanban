import type { FastifyInstance } from "fastify";
import type { z } from "zod";
import { db } from "../prisma/db.js";
import { getBoardAccess, requireBoardAdmin } from "../utils/board-access.js";
import { boardIdParamsSchema } from "../schemas/boards.js";
import {
  columnIdParamsSchema,
  createColumnSchema,
  updateColumnSchema,
} from "../schemas/columns.js";

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

    const access = await getBoardAccess(
      body.boardId,
      userId,
    );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    const column = await db.orm.public.BoardColumn.create({
      name: body.name,
      position: body.position,
      boardId: body.boardId,
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

    const updated = await db.orm.public.BoardColumn
      .where({
        id: columnId,
      })
      .update({
        name: body.name,
        position: body.position,
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

    await db.orm.public.BoardColumn
      .where({
        id: columnId,
      })
      .delete();

    return {
      success: true,
    };
  });

}
