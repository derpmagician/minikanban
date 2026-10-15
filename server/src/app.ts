import "dotenv/config";
import Fastify, { type FastifyError, type FastifyReply, type FastifyRequest, } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { z } from "zod";

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
    credentials: true,
  });

  await app.register(cookie);

  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: {
      expiresIn: "15m",
    },
  });

  // Usar Zod como validador de body, params y querystring.
  // Al devolver { value }, Fastify reemplaza request.body/params
  // con los datos ya parseados por Zod.
  app.setValidatorCompiler(({ schema }) => {
    return (data) => {
      if (!(schema instanceof z.ZodType)) {
        return { value: data };
      }

      const result = schema.safeParse(data);

      if (result.success) {
        return { value: result.data };
      }

      const error = Object.assign(new Error("Validation error"), {
        validation: result.error.issues,
      });

      return { error };
    };
  });

  // Formato de error consistente en toda la API
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error.validation) {
      return reply.code(400).send({
        error: "Validation error",
        issues: error.validation as unknown as z.ZodIssue[],
      });
    }

    request.log.error(error);

    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        error: error.message,
      });
    }

    return reply.code(500).send({
      error: "Internal server error",
    });
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