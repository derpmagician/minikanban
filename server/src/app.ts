import Fastify, { type FastifyError, type FastifyReply, type FastifyRequest, } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";

import { env } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { boardRoutes } from "./routes/boards.js";
import { cardRoutes } from "./routes/cards.js";
import { columnRoutes } from "./routes/columns.js";
import { memberRoutes } from "./routes/members.js";
import {
  CLEANUP_INTERVAL_MS,
  deleteExpiredRefreshTokens,
} from "./utils/refresh-tokens.js";


export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: "http://localhost:5173",
    credentials: true,
  });

  await app.register(cookie);

  // Rate limiting solo donde se configura por ruta
  // (login y register lo activan con `config.rateLimit`).
  await app.register(rateLimit, {
    global: false,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
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

  // Formato consistente también para rutas inexistentes
  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      error: "Not found",
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

  // Limpieza periódica de refresh tokens expirados:
  // una pasada al arrancar y luego cada CLEANUP_INTERVAL_MS.
  app.addHook("onReady", async () => {
    const cleanup = async () => {
      try {
        const removed = await deleteExpiredRefreshTokens();

        if (removed > 0) {
          app.log.info({
            removed,
          }, "Refresh tokens expirados eliminados");
        }
      } catch (error) {
        app.log.error(error, "Error limpiando refresh tokens expirados");
      }
    };

    await cleanup();

    const timer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
    timer.unref();
  });

  return app;
}