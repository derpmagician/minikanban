import type { FastifyInstance } from "fastify";
import type { z } from "zod";
import { db } from "../prisma/db.js";
import {
  getBoardAccess,
  getBoardById,
  requireBoardAdmin,
} from "../utils/board-access.js";
import { boardIdParamsSchema } from "../schemas/boards.js";
import {
  addMemberSchema,
  memberIdParamsSchema,
  updateMemberRoleSchema,
} from "../schemas/members.js";
import {
  toPublicUser,
  withPublicUsers,
} from "../utils/public-user.js";

export async function memberRoutes(app: FastifyInstance) {

  // =========================================================
  // ADD MEMBER
  // POST /api/members
  // Solo owner o admin
  // =========================================================

  app.post("/", {
    onRequest: [app.authenticate],
    schema: {
      body: addMemberSchema,
    },
  }, async (request, reply) => {
    const body =
      request.body as z.infer<typeof addMemberSchema>;

    const currentUserId = request.user.userId;

    const board = await getBoardById(body.boardId);

    if (!board) {
      return reply.code(404).send({
        error: "Board not found",
      });
    }

    // 1. Verificar que el usuario actual
    //    sea owner o admin del board
    const access = await requireBoardAdmin(
      body.boardId,
      currentUserId,
    );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    const requestedRole = body.role ?? "member";

    // Solo el owner puede nombrar administradores
    if (requestedRole === "admin" && access.role !== "owner") {
      return reply.code(403).send({
        error: "Only the board owner can add administrators",
      });
    }

    // 2. Buscar al usuario por id, email o username
    let user;

    if (body.userId !== undefined) {
      user = await db.orm.public.User
        .where({
          id: body.userId,
        })
        .first();
    } else if (body.email !== undefined) {
      user = await db.orm.public.User
        .where({
          email: body.email,
        })
        .first();
    } else if (body.username !== undefined) {
      user = await db.orm.public.User
        .where({
          username: body.username,
        })
        .first();
    }

    if (!user) {
      return reply.code(404).send({
        error: "User not found",
      });
    }

    // El owner ya tiene acceso por ser propietario:
    // no debe existir también como BoardMember.
    if (user.id === access.board.ownerId) {
      return reply.code(400).send({
        error: "Board owner cannot be added as a member",
      });
    }

    // 3. Evitar duplicados
    const existing = await db.orm.public.BoardMember
      .where({
        userId: user.id,
        boardId: body.boardId,
      })
      .first();

    if (existing) {
      return reply.code(409).send({
        error: "User already belongs to board",
      });
    }

    // 4. Crear miembro
    const member = await db.orm.public.BoardMember.create({
      userId: user.id,
      boardId: body.boardId,
      role: requestedRole,
    });

    return reply.code(201).send({
      ...member,
      user: toPublicUser(user),
    });
  });

  // =========================================================
  // LIST MEMBERS
  // GET /api/members/board/:boardId
  // Cualquier miembro del board puede ver los miembros
  // =========================================================

  app.get("/board/:boardId", {
    onRequest: [app.authenticate],
    schema: {
      params: boardIdParamsSchema,
    },
  }, async (request, reply) => {
    const { boardId } =
      request.params as z.infer<typeof boardIdParamsSchema>;

    const userId = request.user.userId;

    const board = await getBoardById(boardId);

    if (!board) {
      return reply.code(404).send({
        error: "Board not found",
      });
    }

    const access = await getBoardAccess(boardId, userId);

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    const members = await db.orm.public.BoardMember
      .where({
        boardId,
      })
      .orderBy((member) => member.id.asc())
      .all();

    return await withPublicUsers(members);
  });

  // =========================================================
  // CHANGE MEMBER ROLE
  // PATCH /api/members/:memberId/role
  // Solo el owner
  // =========================================================

  app.patch("/:memberId/role", {
    onRequest: [app.authenticate],
    schema: {
      params: memberIdParamsSchema,
      body: updateMemberRoleSchema,
    },
  }, async (request, reply) => {
    const { memberId } =
      request.params as z.infer<typeof memberIdParamsSchema>;

    const body =
      request.body as z.infer<typeof updateMemberRoleSchema>;

    const member = await db.orm.public.BoardMember
      .where({
        id: memberId,
      })
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
      .where({
        id: memberId,
      })
      .update({
        role: body.role,
      });

    const user = await db.orm.public.User
      .where({
        id: member.userId,
      })
      .first();

    return {
      ...updated,
      user: user ? toPublicUser(user) : null,
    };
  });

  // =========================================================
  // DELETE MEMBER
  // DELETE /api/members/:memberId
  // Solo owner o admin
  // =========================================================

  app.delete("/:memberId", {
    onRequest: [app.authenticate],
    schema: {
      params: memberIdParamsSchema,
    },
  }, async (request, reply) => {
    const { memberId } =
      request.params as z.infer<typeof memberIdParamsSchema>;

    // 1. Buscar el miembro
    const member = await db.orm.public.BoardMember
      .where({
        id: memberId,
      })
      .first();

    if (!member) {
      return reply.code(404).send({
        error: "Member not found",
      });
    }

    // 2. Verificar owner/admin del board
    const access = await requireBoardAdmin(
      member.boardId,
      request.user.userId,
    );

    if (!access) {
      return reply.code(403).send({
        error: "Forbidden",
      });
    }

    // 3. No permitir eliminar al owner
    if (member.userId === access.board.ownerId) {
      return reply.code(400).send({
        error: "Cannot remove board owner",
      });
    }

    // 4. Eliminar
    await db.orm.public.BoardMember
      .where({
        id: memberId,
      })
      .delete();

    return {
      success: true,
    };
  });

}
