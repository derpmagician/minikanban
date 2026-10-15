import type { FastifyInstance } from "fastify";
import type { z } from "zod";
import argon2 from "argon2";

import { db } from "../prisma/db.js";
import { registerSchema, loginSchema } from "../schemas/auth.js";
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  consumeRefreshToken,
  issueRefreshToken,
  setRefreshCookie,
} from "../utils/refresh-tokens.js";

export async function authRoutes(app: FastifyInstance) {

  // =========================================================
  // REGISTER
  // POST /api/auth/register
  // =========================================================

  app.post("/register", {
    schema: {
      body: registerSchema,
    },
  }, async (request, reply) => {

    // 1. Obtener los datos ya validados
    const {
      email,
      username,
      name,
      password,
    } = request.body as z.infer<typeof registerSchema>;

    // 2. Normalizar datos
    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const normalizedUsername = username
      .trim();

    // 3. Comprobar email existente
    const existingEmail =
      await db.orm.public.User
        .where({
          email: normalizedEmail,
        })
        .first();

    if (existingEmail) {
      return reply.code(409).send({
        error: "Email already exists",
      });
    }

    // 4. Comprobar username existente
    const existingUsername =
      await db.orm.public.User
        .where({
          username: normalizedUsername,
        })
        .first();

    if (existingUsername) {
      return reply.code(409).send({
        error: "Username already exists",
      });
    }

    // 5. Convertir la contraseña en un hash seguro
    const passwordHash =
      await argon2.hash(password, {
        type: argon2.argon2id,
      });

    // 6. Crear el usuario
    const user =
      await db.orm.public.User.create({
        email: normalizedEmail,
        username: normalizedUsername,
        name: name ?? null,
        passwordHash,
      });

    // 7. Nunca devolver passwordHash
    return reply.code(201).send({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

  // =========================================================
  // LOGIN
  // POST /api/auth/login
  // Devuelve un access token (15m) y guarda el
  // refresh token (7d) en una cookie httpOnly.
  // =========================================================

  app.post("/login", {
    schema: {
      body: loginSchema,
    },
  }, async (request, reply) => {

    // 1. Obtener datos validados
    const {
      email,
      password,
    } = request.body as z.infer<typeof loginSchema>;

    // 2. Normalizar email
    const normalizedEmail =
      email.trim().toLowerCase();

    // 3. Buscar usuario
    const user =
      await db.orm.public.User
        .where({
          email: normalizedEmail,
        })
        .first();

    // 4. No revelar si el email existe
    if (!user) {
      return reply.code(401).send({
        error: "Invalid credentials",
      });
    }

    // 5. Verificar contraseña
    const validPassword =
      await argon2.verify(
        user.passwordHash,
        password,
      );

    if (!validPassword) {
      return reply.code(401).send({
        error: "Invalid credentials",
      });
    }

    // 6. Firmar access token y emitir refresh token
    const accessToken =
      await app.jwt.sign({
        userId: user.id,
      });

    const refreshToken =
      await issueRefreshToken(user.id);

    setRefreshCookie(reply, refreshToken);

    // 7. Login correcto
    return reply.send({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  });

  // =========================================================
  // REFRESH
  // POST /api/auth/refresh
  // Rota el refresh token y devuelve un nuevo access token.
  // =========================================================

  app.post("/refresh", async (request, reply) => {

    // 1. Leer la cookie
    const token = request.cookies[REFRESH_COOKIE_NAME];

    if (!token) {
      return reply.code(401).send({
        error: "Missing refresh token",
      });
    }

    // 2. Consumir el token (rotación: un solo uso)
    const stored = await consumeRefreshToken(token);

    if (!stored) {
      clearRefreshCookie(reply);

      return reply.code(401).send({
        error: "Invalid refresh token",
      });
    }

    // 3. Comprobar que el usuario siga existiendo
    const user =
      await db.orm.public.User
        .where({
          id: stored.userId,
        })
        .first();

    if (!user) {
      clearRefreshCookie(reply);

      return reply.code(401).send({
        error: "Invalid refresh token",
      });
    }

    // 4. Nuevo access token y nuevo refresh token
    const accessToken =
      await app.jwt.sign({
        userId: user.id,
      });

    const newRefreshToken =
      await issueRefreshToken(user.id);

    setRefreshCookie(reply, newRefreshToken);

    return reply.send({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  });
}
