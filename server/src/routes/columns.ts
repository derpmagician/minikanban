import type { FastifyInstance } from "fastify";
import { db } from "../prisma/db.js";
import { getBoardAccess, requireBoardRole, requireBoardAdmin } from "../utils/board-access.js";

export async function columnRoutes(app: FastifyInstance) {

  app.post("/", { onRequest: [app.authenticate], }, async (request, reply) => {
    const body = request.body as {
      name: string;
      position: number;
      boardId: number;
    };

    const userId = request.user.userId;

    const access =
      await getBoardAccess(
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

  },);

  app.get("/board/:boardId", { onRequest: [app.authenticate], }, async (request, reply) => {
    const { boardId } =
      request.params as {
        boardId: string;
      };

    const id = Number(boardId);

    if (!Number.isInteger(id)) {
      return reply.code(400).send({
        error: "Invalid board id",
      });
    }

    const userId = request.user.userId;

    const access = await getBoardAccess(
      id,
      userId,
    );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    const columns = await db.orm.public.BoardColumn
      .where({
        boardId: id,
      })
      .all();

    return columns;

  },);

  app.put("/:columnId", { onRequest: [app.authenticate], }, async (request, reply) => {
    const { columnId } =
      request.params as {
        columnId: string;
      };

    const id = Number(columnId);

    if (!Number.isInteger(id)) {
      return reply.code(400).send({
        error: "Invalid column id",
      });
    }

    const body = request.body as {
      name: string;
      position: number;
    };

    const column = await db.orm.public.BoardColumn
      .where({
        id,
      })
      .first();

    if (!column) {
      return reply.code(404).send({
        error: "Column not found",
      });
    }

    const userId = request.user.userId;

    const access =
      await getBoardAccess(
        column.boardId,
        userId,
      );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    const updated =
      await db.orm.public.BoardColumn
        .where({
          id,
        })
        .update({
          name: body.name,
          position: body.position,
        });

    return updated;

  },);

  app.delete("/:columnId", { onRequest: [app.authenticate], }, async (request, reply) => {
    const { columnId } =
      request.params as {
        columnId: string;
      };

    const id = Number(columnId);

    if (!Number.isInteger(id)) {
      return reply.code(400).send({
        error: "Invalid column id",
      });
    }

    const column = await db.orm.public.BoardColumn
      .where({
        id,
      })
      .first();

    if (!column) {
      return reply.code(404).send({
        error: "Column not found",
      });
    }

    const userId = request.user.userId;

    const access = await requireBoardRole(
      column.boardId,
      userId,
      ["owner", "admin"],
    );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    await db.orm.public.BoardColumn
      .where({
        id,
      })
      .delete();

    return {
      success: true,
    };

  },);
}