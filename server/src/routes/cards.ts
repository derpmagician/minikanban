import type { FastifyInstance } from "fastify";
import type { z } from "zod";
import { db } from "../prisma/db.js";
import { getBoardAccess, requireBoardAdmin } from "../utils/board-access.js";
import { columnIdParamsSchema } from "../schemas/columns.js";
import {
  cardIdParamsSchema,
  createCardSchema,
  moveCardSchema,
  updateCardSchema,
} from "../schemas/cards.js";

export async function cardRoutes(app: FastifyInstance) {

  // =========================================================
  // CREATE CARD
  // POST /api/cards
  // =========================================================

  app.post("/", {
    onRequest: [app.authenticate],
    schema: {
      body: createCardSchema,
    },
  }, async (request, reply) => {
    const body =
      request.body as z.infer<typeof createCardSchema>;

    const column = await db.orm.public.BoardColumn
      .where({
        id: body.columnId,
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

    const card = await db.orm.public.Card.create({
      title: body.title,
      description: body.description ?? null,
      position: body.position,
      priority: body.priority ?? "medium",
      columnId: body.columnId,
      assigneeId: body.assigneeId ?? null,
      dueDate: body.dueDate
        ? Temporal.Instant.from(body.dueDate)
        : null,
    });

    return reply.code(201).send(card);
  });

  // =========================================================
  // LIST CARDS
  // GET /api/cards/column/:columnId
  // =========================================================

  app.get("/column/:columnId", {
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

    const access = await getBoardAccess(
      column.boardId,
      userId,
    );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    const cards = await db.orm.public.Card
      .where({
        columnId,
      })
      .all();

    return cards;
  });

  // =========================================================
  // MOVE CARD
  // PATCH /api/cards/:cardId/move
  // =========================================================

  app.patch("/:cardId/move", {
    onRequest: [app.authenticate],
    schema: {
      params: cardIdParamsSchema,
      body: moveCardSchema,
    },
  }, async (request, reply) => {
    const { cardId } =
      request.params as z.infer<typeof cardIdParamsSchema>;

    const body =
      request.body as z.infer<typeof moveCardSchema>;

    const card = await db.orm.public.Card
      .where({
        id: cardId,
      })
      .first();

    if (!card) {
      return reply.code(404).send({
        error: "Card not found",
      });
    }

    // Columna actual de la tarjeta
    const currentColumn = await db.orm.public.BoardColumn
      .where({
        id: card.columnId,
      })
      .first();

    if (!currentColumn) {
      return reply.code(404).send({
        error: "Current column not found",
      });
    }

    const userId = request.user.userId;

    const access = await getBoardAccess(
      currentColumn.boardId,
      userId,
    );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    // Comprobar que la columna destino existe
    const targetColumn = await db.orm.public.BoardColumn
      .where({
        id: body.columnId,
      })
      .first();

    if (!targetColumn) {
      return reply.code(404).send({
        error: "Target column not found",
      });
    }

    // La columna destino debe pertenecer al mismo board
    if (targetColumn.boardId !== currentColumn.boardId) {
      return reply.code(400).send({
        error: "Target column belongs to another board",
      });
    }

    const updated = await db.orm.public.Card
      .where({
        id: cardId,
      })
      .update({
        columnId: body.columnId,
        position: body.position,
      });

    return updated;
  });

  // =========================================================
  // UPDATE CARD
  // PUT /api/cards/:cardId
  // =========================================================

  app.put("/:cardId", {
    onRequest: [app.authenticate],
    schema: {
      params: cardIdParamsSchema,
      body: updateCardSchema,
    },
  }, async (request, reply) => {
    const { cardId } =
      request.params as z.infer<typeof cardIdParamsSchema>;

    const body =
      request.body as z.infer<typeof updateCardSchema>;

    const card = await db.orm.public.Card
      .where({
        id: cardId,
      })
      .first();

    if (!card) {
      return reply.code(404).send({
        error: "Card not found",
      });
    }

    const column = await db.orm.public.BoardColumn
      .where({
        id: card.columnId,
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

    const updated = await db.orm.public.Card
      .where({
        id: cardId,
      })
      .update({
        title: body.title,
        description: body.description ?? null,
        priority: body.priority ?? card.priority,
        dueDate: body.dueDate
          ? Temporal.Instant.from(body.dueDate)
          : null,
      });

    return updated;
  });

  // =========================================================
  // DELETE CARD
  // DELETE /api/cards/:cardId
  // Solo owner o admin
  // =========================================================

  app.delete("/:cardId", {
    onRequest: [app.authenticate],
    schema: {
      params: cardIdParamsSchema,
    },
  }, async (request, reply) => {
    const { cardId } =
      request.params as z.infer<typeof cardIdParamsSchema>;

    const card = await db.orm.public.Card
      .where({
        id: cardId,
      })
      .first();

    if (!card) {
      return reply.code(404).send({
        error: "Card not found",
      });
    }

    const column = await db.orm.public.BoardColumn
      .where({
        id: card.columnId,
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

    await db.orm.public.Card
      .where({
        id: cardId,
      })
      .delete();

    return {
      success: true,
    };
  });

}
