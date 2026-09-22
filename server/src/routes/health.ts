import type { FastifyInstance } from "fastify";
import { db } from "../prisma/db.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      status: "ok",
      database: "ok",
    };
  });
}