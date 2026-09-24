import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { boardRoutes } from "./routes/boards.js";
import { columnRoutes } from "./routes/columns.js";
import { cardRoutes } from "./routes/cards.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: "http://localhost:5173",
  });

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
    prefix: "api/columns"
  })

  await app.register(cardRoutes, {
    prefix: "/api/cards"
  });

  return app;
}