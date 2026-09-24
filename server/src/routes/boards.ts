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