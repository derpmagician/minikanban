import { db } from "../prisma/db.js";

type UserRow = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
};

export type PublicUser = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
};

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
  };
}

export function toPublicUsers(users: UserRow[]): Map<number, PublicUser> {
  return new Map(
    users.map((user) => [user.id, toPublicUser(user)]),
  );
}

export async function withPublicUsers<T extends { userId: number }>(
  rows: T[],
): Promise<(T & { user: PublicUser | null })[]> {
  if (rows.length === 0) {
    return [];
  }

  const users = toPublicUsers(await db.orm.public.User.all());

  return rows.map((row) => ({
    ...row,
    user: users.get(row.userId) ?? null,
  }));
}
