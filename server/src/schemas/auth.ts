import { z } from "zod";

export const registerSchema = z.object({
	email: z.email(),
	username: z.string().min(3).max(30),
	name: z.string().min(1).max(100).optional(),
	password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});
