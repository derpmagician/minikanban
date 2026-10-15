import "dotenv/config";

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. ` +
      "Copia .env.example a .env y configúrala.",
    );
  }

  return value;
}

export const env = {
  DATABASE_URL: requiredEnv("DATABASE_URL"),
  JWT_SECRET: requiredEnv("JWT_SECRET"),
  NODE_ENV: process.env.NODE_ENV ?? "development",
} as const;
