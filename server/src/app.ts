import "dotenv/config";
import Fastify, { type FastifyReply, type FastifyRequest, } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { authPlugin } from "./plugins/auth.js";

import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { boardRoutes } from "./routes/boards.js";
import { cardRoutes } from "./routes/cards.js";
import { columnRoutes } from "./routes/columns.js";
import { memberRoutes } from "./routes/members.js";


export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: "http://localhost:5173",
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
  });

  app.decorate(
    "authenticate",
    async function (
      request: FastifyRequest,
      reply: FastifyReply,
    ) {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({
          error: "Unauthorized",
        });
      }
    },
  );

  app.get("/", async () => {
    return {
      message: "Hello from API",
    };
  });

  await app.register(healthRoutes, {
    prefix: "/api",
  });

  await app.register(authRoutes, {
    prefix: "/api/auth",
  })


  await app.register(boardRoutes, {
    prefix: "/api/boards"
  })

  await app.register(columnRoutes, {
    prefix: "/api/columns"
  })

  await app.register(cardRoutes, {
    prefix: "/api/cards"
  });

  await app.register(memberRoutes, {
    prefix: "/api/members",
  });

  return app;
}