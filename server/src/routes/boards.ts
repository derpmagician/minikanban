import type { FastifyInstance } from "fastify";
import { db } from "../prisma/db.js";

export async function boardRoutes(app: FastifyInstance) {

  app.post("/", async (request, reply) => {

    const body = request.body as {
      name: string;
      ownerId: number;
    };

    const owner =
      await db.orm.public.User
        .where({
          id: body.ownerId,
        })
        .first();

    if (!owner) {
      return reply.code(404).send({
        error: "Owner not found",
      });
    }

    const board =
      await db.orm.public.Board.create({
        name: body.name,
        ownerId: body.ownerId,
      });

    return reply.code(201).send(board);
  });

  app.get("/", async () => {
    const boards =
      await db.orm.public.Board
        .where({})
        .all();

    return boards;
  });

  app.get("/:boardId", async (request, reply) => {
    const { boardId } = request.params as {
      boardId: string;
    };

    const board = await db.orm.public.Board
      .where({
        id: Number(boardId),
      })
      .first();

    if(!board) {
      return reply.code(404).send({
        error: "Board not found"
      })
    }

    return board;
  })

  app.get("/:boardId/full", async (request, reply) => {

    const { boardId } = request.params as {
      boardId: string;
    };

    const id = Number(boardId);

    if (!Number.isInteger(id)) {
      return reply.code(400).send({
        error: "Invalid board id",
      });
    }

    // Obtener el tablero
    const board =
      await db.orm.public.Board
        .where({
          id,
        })
        .first();

    if (!board) {
      return reply.code(404).send({
        error: "Board not found",
      });
    }

    // Obtener los miembros del tablero
    const members =
      await db.orm.public.BoardMember
        .where({
          boardId: id,
        })
        .all();

    // Obtener las columnas del tablero
    const columns =
      await db.orm.public.BoardColumn
        .where({
          boardId: id,
        })
        .all();

    // Obtener las tarjetas de cada columna
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
      })
    );

    return {
      ...board,
      members,
      columns: columnsWithCards,
    };

  });


  app.put("/:boardId", async (request, reply) => {
    const { boardId } = request.params as {
      boardId: string;
    };

    const body = request.body as {
      name: string;
    }

    const board =
      await db.orm.public.Board
        .where({
          id: Number(boardId),
        })
        .first();

      if (!board) {
        return reply.code(404).send({
          error: "Board not found"
        })
      }
      
      const updated =
        await db.orm.public.Board
          .where({
            id: Number(boardId),
          })
          .update({
            name: body.name,
          });

      return updated;

  })

  app.delete("/:boardId", async (request, reply) => {
    const {boardId} = request.params as {
      boardId: string;
    };

    const board =
      await db.orm.public.Board
        .where({
          id: Number(boardId),
        })
        .first();

    if (!board) {
      return reply.code(404).send({
        error: "Board not found"
      });
    }

    await db.orm.public.Board
      .where({
        id: Number(boardId),
      })
      .delete();

    return {
      success: true
    }


  });

}