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

}