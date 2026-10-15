import { createHash, randomBytes } from "node:crypto";
import type { FastifyReply } from "fastify";
import { env } from "../config.js";
import { db } from "../prisma/db.js";

export const REFRESH_COOKIE_NAME = "refreshToken";
export const REFRESH_TOKEN_TTL_DAYS = 7;
export const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const REFRESH_COOKIE_PATH = "/api/auth";

// Nunca se guarda el token en claro: solo su hash SHA-256.
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: env.NODE_ENV === "production",
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

// Revoca un refresh token concreto (logout).
// Es idempotente: si no existe, no hace nada.
export async function revokeRefreshToken(token: string) {
  await db.orm.public.RefreshToken
    .where({
      tokenHash: hashToken(token),
    })
    .delete();
}

// Revoca todas las sesiones de un usuario.
// Devuelve cuántas sesiones se revocaron.
// OJO: .delete() solo borra una fila; para borrado masivo
// el ORM usa .deleteAndCount().
export async function revokeAllUserTokens(userId: number) {
  return await db.orm.public.RefreshToken
    .where((token) => token.userId.eq(userId))
    .deleteAndCount();
}

// Elimina los refresh tokens ya expirados.
// Devuelve cuántos eliminó.
export async function deleteExpiredRefreshTokens() {
  const now = Temporal.Now.instant();

  return await db.orm.public.RefreshToken
    .where((token) => token.expiresAt.lt(now))
    .deleteAndCount();
}
