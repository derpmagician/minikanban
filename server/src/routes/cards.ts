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
import {
  clampIndex,
  rewriteCardPositions,
  sortByPosition,
} from "../utils/positions.js";

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

    // El usuario asignado debe pertenecer al board.
    if (body.assigneeId != null) {
      const assigneeAccess = await getBoardAccess(
        column.boardId,
        body.assigneeId,
      );

      if (!assigneeAccess) {
        return reply.code(400).send({
          error: "Assignee is not a board member",
        });
      }
    }

    // Insertar la card en la posición pedida (limitada al total)
    // y desplazar el resto de la columna para dejar hueco.
    const card = await db.transaction(async (tx) => {
      const cards = sortByPosition(
        await tx.orm.public.Card
          .where({
            columnId: body.columnId,
          })
          .all(),
      );

      const position = clampIndex(
        body.position,
        cards.length,
      );

      await rewriteCardPositions(
        tx,
        cards,
        position,
        1,
      );

      return await tx.orm.public.Card.create({
        title: body.title,
        description: body.description ?? null,
        position,
        priority: body.priority ?? "medium",
        columnId: body.columnId,
        assigneeId: body.assigneeId ?? null,
        dueDate: body.dueDate
          ? Temporal.Instant.from(body.dueDate)
          : null,
      });
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
      .orderBy([
        (card) => card.position.asc(),
        (card) => card.id.asc(),
      ])
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

    // Reordenar: si la columna es la misma se recoloca la card
    // dentro de la lista; si cambia, se compacta el origen y se
    // abre hueco en el destino. Todo dentro de una transacción.
    const updated = await db.transaction(async (tx) => {
      const sourceCards = sortByPosition(
        await tx.orm.public.Card
          .where({
            columnId: currentColumn.id,
          })
          .all(),
      ).filter((row) => row.id !== card.id);

      if (targetColumn.id === currentColumn.id) {
        const position = clampIndex(
          body.position,
          sourceCards.length,
        );

        sourceCards.splice(position, 0, card);

        await rewriteCardPositions(tx, sourceCards);
      } else {
        const targetCards = sortByPosition(
          await tx.orm.public.Card
            .where({
              columnId: targetColumn.id,
            })
            .all(),
        );

        const position = clampIndex(
          body.position,
          targetCards.length,
        );

        targetCards.splice(position, 0, card);

        await rewriteCardPositions(tx, sourceCards);
        await rewriteCardPositions(tx, targetCards);

        await tx.orm.public.Card
          .where({
            id: card.id,
          })
          .update({
            columnId: targetColumn.id,
          });
      }

      const moved = await tx.orm.public.Card
        .where({
          id: card.id,
        })
        .first();

      return moved ?? card;
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

    const changes: {
      title?: string;
      description?: string | null;
      priority?: "low" | "medium" | "high";
      dueDate?: Temporal.Instant | null;
      assigneeId?: number | null;
    } = {};

    if (body.title !== undefined) {
      changes.title = body.title;
    }

    if (body.description !== undefined) {
      changes.description = body.description ?? null;
    }

    if (body.priority !== undefined) {
      changes.priority = body.priority;
    }

    if (body.dueDate !== undefined) {
      changes.dueDate = body.dueDate
        ? Temporal.Instant.from(body.dueDate)
        : null;
    }

    if (body.assigneeId !== undefined) {
      if (body.assigneeId !== null) {
        const assigneeAccess = await getBoardAccess(
          column.boardId,
          body.assigneeId,
        );

        if (!assigneeAccess) {
          return reply.code(400).send({
            error: "Assignee is not a board member",
          });
        }
      }

      changes.assigneeId = body.assigneeId;
    }

    const updated = await db.orm.public.Card
      .where({
        id: cardId,
      })
      .update(changes);

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

    // Eliminar y compactar las posiciones restantes
    await db.transaction(async (tx) => {
      const cards = sortByPosition(
        await tx.orm.public.Card
          .where({
            columnId: column.id,
          })
          .all(),
      );

      const index = cards.findIndex(
        (row) => row.id === card.id,
      );

      await tx.orm.public.Card
        .where({
          id: cardId,
        })
        .delete();

      if (index !== -1) {
        await rewriteCardPositions(
          tx,
          cards,
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
