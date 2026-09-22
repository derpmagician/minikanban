import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";

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

  return app;
}