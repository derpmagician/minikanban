import type { FastifyInstance } from "fastify";
import { db } from "../prisma/db.js";

export async function authRoutes(app: FastifyInstance) {

	app.post("/register", async (request, reply) => {
		
		const body = request.body as {
      email: string;
      password: string;
      username: string;
    };

		const existingUser =
			await db.orm.public.User
				.where({
					email: body.email,
				})
				.first();

    if (existingUser) {
      return reply.code(409).send({
        error: "Email already exists",
      });
    }

		const user =
			await db.orm.public.User.create({
				email: body.email,
				username: body.username,
				passwordHash: body.password,

			});

	return reply.code(201).send(user);
	});
}
