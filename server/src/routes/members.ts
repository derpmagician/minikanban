import type { FastifyInstance } from "fastify";
import { db } from "../prisma/db.js";

export async function memberRoutes(app: FastifyInstance) {

	app.post("/", async (request, reply) => {

		const body = request.body as {
			userId: number;
			boardId: number;
			role?: "admin" | "member";
		};

		const user =
			await db.orm.public.User
				.where({
					id: body.userId,
				})
				.first();

		if (!user) {
			return reply.code(404).send({
				error: "User not found",
			});
		}

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

		const existing =
			await db.orm.public.BoardMember
				.where({
					userId: body.userId,
					boardId: body.boardId,
				})
				.first();

		if (existing) {
			return reply.code(409).send({
				error: "User already belongs to board",
			});
		}

		const member =
			await db.orm.public.BoardMember.create({
				userId: body.userId,
				boardId: body.boardId,
				role: body.role ?? "member",
			});

		return reply.code(201).send(member);

	});

	app.get("/board/:boardId", async (request) => {

		const { boardId } = request.params as {
			boardId: string;
		};

		const members =
			await db.orm.public.BoardMember
				.where({
					boardId: Number(boardId),
				})
				.all();

		return members;

	});

	app.delete("/:memberId", async (request, reply) => {

		const { memberId } = request.params as {
			memberId: string;
		};

		const deleted = await db.orm.public.BoardMember
			.where({
        id: Number(memberId)
      })
      .delete();

		if (!deleted) {
      return reply.code(404).send({
        error: "Member not found"
      });
    }

	});
}