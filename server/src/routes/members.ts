import type { FastifyInstance } from "fastify";
import { db } from "../prisma/db.js";
import { getBoardAccess, requireBoardAdmin, } from "../utils/board-access.js";

export async function memberRoutes(
  app: FastifyInstance,
) {

  // ==================================================
  // AGREGAR MIEMBRO
  // POST /api/members
  // ==================================================

  app.post("/", { onRequest: [app.authenticate], }, async (request, reply) => {

		const body =
			request.body as {
				userId: number;
				boardId: number;
				role?: "admin" | "member";
			};

		const currentUserId =
			request.user.userId;

		// ----------------------------------------------
		// 1. Verificar que el usuario actual
		//    sea owner o admin del board
		// ----------------------------------------------

		const access = await requireBoardAdmin(
			body.boardId,
			currentUserId,
		);

		if (!access) {
			return reply.code(403).send({
				error: "Forbidden",
			});
		}

		// ----------------------------------------------
		// 2. Verificar que el usuario que queremos
		//    agregar exista
		// ----------------------------------------------

		const user = await db.orm.public.User
			.where({
				id: body.userId,
			})
			.first();

		if (!user) {
			return reply.code(404).send({
				error: "User not found",
			});
		}

		// ----------------------------------------------
		// 3. Evitar duplicados
		// ----------------------------------------------

		const existing = await db.orm.public.BoardMember
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

		// ----------------------------------------------
		// 4. Crear miembro
		// ----------------------------------------------

		const member = await db.orm.public.BoardMember.create({
			userId: body.userId,
			boardId: body.boardId,
			role: body.role ?? "member",
		});

		return reply.code(201).send(member);

  },);


  // ==================================================
  // LISTAR MIEMBROS
  // GET /api/members/board/:boardId
  // ==================================================

  app.get("/board/:boardId", { onRequest: [app.authenticate], }, async (request, reply) => {

		const { boardId } = request.params as {
				boardId: string;
			};

		const id = Number(boardId);

		if (!Number.isInteger(id)) {
			return reply.code(400).send({
				error: "Invalid board id",
			});
		}

		const userId = request.user.userId;

		// ----------------------------------------------
		// Cualquier miembro del board puede ver
		// los miembros
		// ----------------------------------------------

		const access = await getBoardAccess(
			id,
			userId,
		);

		if (!access) {
			return reply.code(403).send({
				error: "Forbidden",
			});
		}

		const members = await db.orm.public.BoardMember
			.where({
				boardId: id,
			})
			.all();

		return members;

	},
);



  app.patch("/:memberId/role", { onRequest: [app.authenticate], }, async (request, reply) => {
		const { memberId } = request.params as {
			memberId: string;
		};

		const id = Number(memberId);

		if (!Number.isInteger(id)) {
			return reply.code(400).send({
				error: "Invalid member id",
			});
		}

		const body = request.body as {
			role: "admin" | "member";
		};

		if (body.role !== "admin" && body.role !== "member") {
			return reply.code(400).send({
				error: "Invalid role",
			});
		}

		const member = await db.orm.public.BoardMember
			.where({ id })
			.first();

		if (!member) {
			return reply.code(404).send({
				error: "Member not found",
			});
		}

		const board = await db.orm.public.Board
			.where({
				id: member.boardId,
			})
			.first();

		if (!board) {
			return reply.code(404).send({
				error: "Board not found",
			});
		}

		if (board.ownerId !== request.user.userId) {
			return reply.code(403).send({
				error: "Only the board owner can change member roles",
			});
		}

		const updated = await db.orm.public.BoardMember
			.where({ id })
			.update({
				role: body.role,
			});

		return updated;

  },);



  // ==================================================
  // ELIMINAR MIEMBRO
  // DELETE /api/members/:memberId
  // ==================================================

  app.delete("/:memberId", { onRequest: [app.authenticate], }, async (request, reply) => {

		const { memberId } = request.params as {
			memberId: string;
		};

		const id = Number(memberId);

		if (!Number.isInteger(id)) {
			return reply.code(400).send({
				error: "Invalid member id",
			});
		}

		// ----------------------------------------------
		// 1. Buscar el miembro
		// ----------------------------------------------

		const member = await db.orm.public.BoardMember
			.where({
				id,
			})
			.first();

		if (!member) {
			return reply.code(404).send({
				error: "Member not found",
			});
		}

		// ----------------------------------------------
		// 2. Verificar owner/admin del board
		// ----------------------------------------------

		const access = await requireBoardAdmin(
			member.boardId,
			request.user.userId,
		);

		if (!access) {
			return reply.code(403).send({
				error: "Forbidden",
			});
		}

		// ----------------------------------------------
		// 3. No permitir eliminar al owner
		//
		// El owner ni siquiera debería existir
		// como BoardMember, pero mantenemos esta
		// protección por seguridad.
		// ----------------------------------------------

		if ( member.userId === access.board.ownerId ) {
			return reply.code(400).send({
				error: "Cannot remove board owner",
			});
		}

		// ----------------------------------------------
		// 4. Eliminar
		// ----------------------------------------------

		await db.orm.public.BoardMember
			.where({
				id,
			})
			.delete();

		return {
			success: true,
		};

	},
);}