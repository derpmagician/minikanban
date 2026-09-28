import type { FastifyInstance } from "fastify";
import argon2 from "argon2";

import { db } from "../prisma/db.js";
import { registerSchema, loginSchema } from "../schemas/auth.js";

export async function authRoutes(app: FastifyInstance) {

  app.post("/register", async (request, reply) => {

    // 1. Validar los datos recibidos
    const parsed = registerSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation error",
        issues: parsed.error.issues,
      });
    }

    // 2. Obtener los datos ya validados
    const {
      email,
      username,
      name,
      password,
    } = parsed.data;

    // 3. Normalizar datos
    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const normalizedUsername = username
      .trim();

    // 4. Comprobar email existente
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

    // 5. Comprobar username existente
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

    // 6. Convertir la contraseña en un hash seguro
    const passwordHash =
      await argon2.hash(password, {
        type: argon2.argon2id,
      });

    // 7. Crear el usuario
    const user =
      await db.orm.public.User.create({
        email: normalizedEmail,
        username: normalizedUsername,
        name: name ?? null,
        passwordHash,
      });

    // 8. Nunca devolver passwordHash
    return reply.code(201).send({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

	app.post("/login", async (request, reply) => {

		// 1. Validar los datos
		const parsed = loginSchema.safeParse(request.body);

		if (!parsed.success) {
			return reply.code(400).send({
				error: "Validation error",
				issues: parsed.error.issues,
			});
		}

		// 2. Obtener datos validados
		const {
			email,
			password,
		} = parsed.data;

		// 3. Normalizar email
		const normalizedEmail =
			email.trim().toLowerCase();

		// 4. Buscar usuario
		const user =
			await db.orm.public.User
				.where({
					email: normalizedEmail,
				})
				.first();

		// 5. No revelar si el email existe
		if (!user) {
			return reply.code(401).send({
				error: "Invalid credentials",
			});
		}

		// 6. Verificar contraseña
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

		const accessToken =
			await app.jwt.sign({
				userId: user.id,
			});

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
}