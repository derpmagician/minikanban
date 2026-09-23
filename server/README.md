# minikanban — server

API REST construida con Fastify + Prisma ORM 8 (PostgreSQL).

## Requisitos

- Node.js 24 LTS o superior
- PostgreSQL 15 o superior
- pnpm

## Primera ejecución

1. Copia `.env.example` a `.env` y configura tu cadena de conexión:

   ```env
   DATABASE_URL="postgresql://usuario:password@localhost:5432/minikanban"
   ```

2. Instala dependencias:

   ```bash
   pnpm install
   ```

3. Crea las tablas en la base de datos:

   ```bash
   npx prisma db init
   ```

4. Arranca el servidor de desarrollo:

   ```bash
   pnpm dev
   ```

   El servidor escucha en `http://localhost:3000` y acepta peticiones CORS desde `http://localhost:5173`.

## Scripts disponibles

- `pnpm dev` — arranca el servidor con recarga automática (`tsx watch`)
- `pnpm build` — compila TypeScript a `dist/`
- `pnpm start` — ejecuta la build compilada
- `pnpm contract:emit` — regenera `contract.json` y `contract.d.ts` tras editar el contrato

### Base de datos y migraciones

- `npx prisma db init` — crea las tablas aplicando las migraciones existentes
- `npx prisma migration status` — muestra el estado de las migraciones

Flujo al cambiar el esquema:

1. Edita `src/prisma/contract.prisma`
2. `pnpm contract:emit` para regenerar los artefactos del contrato
3. Crea y aplica la migración correspondiente

## Estructura

- `src/index.ts` — punto de entrada, arranca el servidor en el puerto 3000
- `src/app.ts` — configuración de Fastify (CORS, rutas)
- `src/routes/` — rutas de la API (prefijo `/api`)
- `src/prisma/contract.prisma` — contrato de datos (modelos)
- `src/prisma/db.ts` — cliente de base de datos
- `prisma.config.ts` — configuración de la CLI de Prisma
- `migrations/` — migraciones de la base de datos

Para la referencia de Prisma ORM 8, consulta `prisma-8.md`.
