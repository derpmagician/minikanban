import type { FastifyInstance } from "fastify";
import { db } from "../prisma/db.js";

export async function cardRoutes(app: FastifyInstance) {
	app.post("/", async (request, reply) => {
		const body = request.body as {
			title: string;
			description?: string;
			position: number;
			priority?: "low" | "medium" | "high";
			columnId: number;
			assigneeId?: number;
			dueDate?: string;
		};

		const column =
			await db.orm.public.BoardColumn
			.where({
				id: body.columnId,
			})
			.first();

		if (!column) {
			return reply.code(404).send({
				error: "Column not found",
			})
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


	})
}