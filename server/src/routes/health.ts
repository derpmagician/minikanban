import type { FastifyInstance } from "fastify";
import { db } from "../prisma/db.js";


export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      status: "ok",
    };
  });

  app.get("/health/db", async (_request, reply) => {

    try {
    await db.orm.public.User.where({}).first();
    return {
      status: "ok",
      database: "ok",
    };
    } catch (error) {
      app.log.error(error);

      return reply.code(503).send({
        status: "error",
        database: "error",
      })
    }
  });
}