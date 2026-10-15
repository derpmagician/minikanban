import { createHash, randomBytes } from "node:crypto";
import type { FastifyReply } from "fastify";
import { db } from "../prisma/db.js";

export const REFRESH_COOKIE_NAME = "refreshToken";
export const REFRESH_TOKEN_TTL_DAYS = 7;
const REFRESH_COOKIE_PATH = "/api/auth";

// Nunca se guarda el token en claro: solo su hash SHA-256.
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE_NAME, {
    path: REFRESH_COOKIE_PATH,
  });
}

// Crea un refresh token opaco y guarda su hash.
export async function issueRefreshToken(userId: number) {
  const token = randomBytes(32).toString("base64url");

  const expiresAt = Temporal.Now.instant().add({
    hours: REFRESH_TOKEN_TTL_DAYS * 24,
  });

  await db.orm.public.RefreshToken.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt,
  });

  return token;
}

// Consume el refresh token aplicando rotación:
// un token solo puede usarse una vez, exista o no en la BD.
// Devuelve null si no existe o si ya expiró.
export async function consumeRefreshToken(token: string) {
  const stored = await db.orm.public.RefreshToken
    .where({
      tokenHash: hashToken(token),
    })
    .first();

  if (!stored) {
    return null;
  }

  await db.orm.public.RefreshToken
    .where({
      id: stored.id,
    })
    .delete();

  if (stored.expiresAt.epochMilliseconds <= Date.now()) {
    return null;
  }

  return stored;
}
