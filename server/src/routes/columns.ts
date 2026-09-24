import type { FastifyInstance } from "fastify";
import { db } from "../prisma/db.js";

export async function columnRoutes(app: FastifyInstance) {

  app.post("/", async (request, reply) => {

    const body = request.body as {
      name: string;
      position: number;
      boardId: number;
    };

    const board =
      await db.orm.public.Board
        .where({
          id: body.boardId,
        })
        .first();

    if (!board) {
      return reply.code(404).send({
        error: "Board not found",
      });
    }

    const column =
      await db.orm.public.BoardColumn.create({
        name: body.name,
        position: body.position,
        boardId: body.boardId,
      });

    return reply.code(201).send(column);
  });

	app.get("/board/:boardId", async(request) => {
		const { boardId } =
			request.params as {
				boardId: string;
			}
		
		const columns =
			await db.orm.public.BoardColumn
				.where({
					boardId: Number(boardId),
				})
				.all();

		return columns;
	})

}