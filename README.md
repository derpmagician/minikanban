# MiniKanban

Aplicación de tableros Kanban con autenticación, columnas, tarjetas (cards), miembros y roles por tablero. El repositorio está organizado como un monorepo con un **servidor** (API REST) y un **cliente** (SPA).

## Funcionalidad

### Cuenta y acceso

- Registro con email, nombre de usuario, nombre opcional y contraseña; login y logout.
- Sesión persistente: access token en memoria y refresh token en cookie `httpOnly`.
- Cuenta demo con datos de ejemplo (ver [Puesta en marcha](#puesta-en-marcha)).

### Tableros

- Listar, crear y abrir tableros.
- El propietario y los administradores pueden renombrar; solo el propietario puede eliminar.
- Vista de tablero con columnas, cards, contadores y panel de miembros.
- El propietario y los administradores pueden invitar por email o nombre de usuario, y quitar miembros; solo el propietario cambia roles.
- Estados de carga, error y tablero vacío con creación de la primera columna.

### Columnas y cards

- Crear, renombrar y eliminar columnas (eliminar requiere rol `owner` o `admin`).
- Crear y editar cards con título, descripción, prioridad (baja, media, alta) y fecha límite.
- Arrastrar y soltar con la API nativa de HTML5 para reordenar cards dentro de una columna o moverlas entre columnas; el orden se persiste en el servidor.
- Indicadores visuales de prioridad y fecha límite, resaltando las vencidas.
- Confirmación antes de eliminar tableros, columnas y cards.

### Equipo y permisos

- Roles por tablero: `owner`, `admin` y `member`.
- Panel de miembros en el tablero: lista al propietario y a los miembros, invita por email o nombre de usuario, permite cambiar el rol (solo `owner`) y quitar miembros (`owner` y `admin`).
- La API admite asignar una card a un miembro; la selección de responsable desde la UI está pendiente.

### Experiencia de uso

- React con diseño responsive para escritorio y móvil.
- El drag & drop usa eventos nativos del navegador; para soporte táctil y por teclado habría que migrar a una librería como `dnd-kit`.
- Modales con cierre por `Esc` o clic fuera, validación de formularios y mensajes de error en español.
- Documentación interactiva de la API en `/docs`.

## Stack

| Parte | Tecnologías |
| --- | --- |
| Servidor | Node.js, TypeScript, Fastify 5, Prisma ORM 8 (PostgreSQL), Zod, JWT + refresh tokens, Argon2 |
| Cliente | React 19, TypeScript, Vite, React Router, TanStack Query, Zustand, drag & drop nativo (HTML5) |
| Base de datos | PostgreSQL 17 (Docker Compose) |
| Tooling | pnpm/npm workspaces, `concurrently`, ESLint |

## Estructura

```
.
├── client/                 # SPA React + Vite
│   └── src/
├── server/                 # API REST Fastify
│   ├── src/
│   │   ├── routes/         # Endpoints (/api/...)
│   │   ├── schemas/        # Validación con Zod
│   │   ├── prisma/         # Contrato y cliente de datos
│   │   ├── utils/          # Acceso a boards, posiciones, refresh tokens
│   │   └── scripts/        # Seed de datos de ejemplo
│   ├── migrations/         # Migraciones de PostgreSQL
│   └── .env.example
├── docker-compose.yml      # PostgreSQL para desarrollo
└── package.json            # Workspaces y script dev raíz
```

## Requisitos

- Node.js 24 LTS o superior
- pnpm (recomendado) o npm
- Docker, o PostgreSQL 15+ instalado localmente (el proyecto funciona de ambas formas)

## Puesta en marcha

En ambos modos Docker solo se encarga de PostgreSQL; el cliente y el servidor siempre se ejecutan con Node.

1. **Instala las dependencias** desde la raíz (workspaces):

   ```bash
   pnpm install
   ```

2. **Prepara PostgreSQL** eligiendo una de las dos opciones:

   **Opción A — con Docker (recomendada):**

   ```bash
   docker compose up -d db
   ```

   Levanta PostgreSQL 17 en `localhost:5432` con base, usuario y contraseña `kanban`.

   **Opción B — sin Docker (PostgreSQL local):**

   Crea la base de datos y un usuario (ajusta nombres si lo prefieres):

   ```sql
   CREATE USER kanban WITH PASSWORD 'kanban';
   CREATE DATABASE kanban OWNER kanban;
   ```

   También puedes usar un usuario existente, por ejemplo `postgres`.

3. **Configura el servidor**:

   ```bash
   cp server/.env.example server/.env
   ```

   Edita `server/.env` con tu cadena de conexión. Con Docker (o con la Opción B tal cual):

   ```env
   DATABASE_URL="postgresql://kanban:kanban@localhost:5432/kanban"
   JWT_SECRET="cambia-este-valor"
   ```

   Sin Docker con otro usuario/puerto, cambia los valores, por ejemplo:

   ```env
   DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/kanban"
   ```

4. **Crea las tablas** aplicando las migraciones (igual en ambos casos):

   ```bash
   cd server
   npx prisma db init
   ```

5. **(Opcional) Carga los datos de ejemplo**:

   ```bash
   pnpm --filter server seed
   ```

   | Credencial | Valor |
   | --- | --- |
   | Email | `demo@minikanban.dev` |
   | Contraseña | `Demo1234` |

6. **Arranca cliente y servidor** desde la raíz:

   ```bash
   pnpm dev
   ```

   - Cliente: <http://localhost:5173>
   - API: <http://localhost:3000>
   - Documentación OpenAPI: <http://localhost:3000/docs>

## Scripts

Desde la raíz:

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Arranca cliente y servidor en modo desarrollo |
| `pnpm --filter server dev` | Solo el servidor (`tsx watch`) |
| `pnpm --filter client dev` | Solo el cliente (Vite) |
| `pnpm --filter server build` | Compila el servidor a `server/dist` |
| `pnpm --filter server start` | Ejecuta el servidor compilado |
| `pnpm --filter server seed` | Normaliza posiciones y recrea el tablero demo |
| `pnpm --filter client build` | Build de producción del cliente |
| `pnpm --filter client lint` | Lint del cliente |

> Con npm los comandos equivalentes son `npm run dev` y `npm run dev --workspace=server|client`.

## API

La API está bajo `/api` y cuenta con documentación interactiva Swagger en `/docs`.

| Recurso | Endpoints principales |
| --- | --- |
| Health | `GET /api/health`, `GET /api/health/db` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `DELETE /api/auth/sessions` |
| Boards | `GET/POST /api/boards`, `GET/PUT/DELETE /api/boards/:id`, `GET /api/boards/:id/full` |
| Columns | `POST /api/columns`, `GET /api/columns/board/:id`, `PUT/DELETE /api/columns/:id` |
| Cards | `POST /api/cards`, `GET /api/cards/column/:id`, `PUT/DELETE /api/cards/:id`, `PATCH /api/cards/:id/move` |
| Members | `POST /api/members`, `GET /api/members/board/:id`, `PATCH /api/members/:id/role`, `DELETE /api/members/:id` |

### Autenticación

- El login devuelve un **access token JWT** (15 minutos) que se envía como `Authorization: Bearer <token>`.
- El **refresh token** viaja en una cookie `httpOnly` (7 días) y rota en cada uso.
- CORS está habilitado con credenciales para `http://localhost:5173` (configurable con `CORS_ORIGINS`).

### Roles por tablero

- `owner`: propietario del board.
- `admin`: puede gestionar contenido e invitar/quitar miembros, pero no nombrar administradores ni cambiar roles.
- `member`: acceso de lectura/edición según el recurso.

`POST /api/members` acepta `userId`, `email` o `username`; la invitación resuelve el usuario por coincidencia exacta y no expone un buscador de usuarios.

## Modelo de datos

`User`, `Board`, `BoardMember`, `BoardColumn`, `Card` y `RefreshToken`. Columnas y cards usan `position` 0-based; el servidor re-secuencia las posiciones en cada operación para evitar huecos o duplicados.

El contrato de datos vive en `server/src/prisma/contract.prisma`. Al modificarlo:

```bash
cd server
pnpm contract:emit
npx prisma migration plan --name <nombre>
npx prisma migration show <carpeta>
npx prisma db migrate --advance-ref db
```

## Seguridad y operación

### Variables de entorno

El servidor falla al arrancar si falta una variable obligatoria (`server/src/config.ts`).

| Variable | Obligatoria | Uso | Valor por defecto |
| --- | --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión a PostgreSQL | — |
| `JWT_SECRET` | Sí | Firma de los access tokens | — |
| `CORS_ORIGINS` | No | Orígenes permitidos, separados por comas | `http://localhost:5173` |
| `NODE_ENV` | No | Activa cookies `Secure` en `production` | `development` |

- `server/.env` no se versiona; parte de `server/.env.example`.
- Usa un `JWT_SECRET` largo y aleatorio (por ejemplo, `openssl rand -base64 48`). Cambiarlo invalida todos los access tokens emitidos.
- En producción configura `CORS_ORIGINS` con el dominio real del cliente, no con `localhost`.
- El cliente usa `VITE_API_URL` para apuntar a otra URL de API; por defecto usa `http://localhost:3000`.

### Autenticación y sesiones

- **Access token**: JWT firmado, expira en **15 minutos** y se envía como `Authorization: Bearer <token>`.
- **Refresh token**: opaco (32 bytes aleatorios), se guarda en la base de datos **solo como hash SHA-256** y viaja en una cookie `httpOnly`, `SameSite=Strict` y `Path=/api/auth`. Dura **7 días** y rota en cada uso: un token solo puede consumirse una vez.
- En `NODE_ENV=production` la cookie añade `Secure`, por lo que **el servicio debe publicarse por HTTPS**.
- `POST /api/auth/logout` revoca el refresh token actual; `DELETE /api/auth/sessions` revoca todas las sesiones del usuario.
- Las contraseñas se almacenan con **Argon2id**.
- Los refresh tokens expirados se limpian al arrancar y cada 6 horas.

### Autorización

- Todos los endpoints de tableros, columnas, cards y miembros exigen JWT y comprueban la pertenencia al tablero.
- Los roles `owner`, `admin` y `member` limitan las operaciones sensibles (renombrar/eliminar tablero, borrar columnas, gestionar miembros).
- Invitar y quitar miembros requiere `owner` o `admin`; cambiar roles y nombrar administradores requiere `owner`. El listado de miembros solo expone `id`, email, username y nombre a quienes ya pertenecen al tablero.
- Un tablero inexistente devuelve **404**; no revela su existencia con un 403.

### Protecciones activas

- Validación de `body`, `params` y `querystring` con Zod y errores con formato consistente.
- Rate limiting por IP: `POST /api/auth/login` **10/min** y `POST /api/auth/register` **5/min**.
- CORS con credenciales y métodos explícitos (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`).
- Consultas parametrizadas a través del ORM; no se concatenan datos de usuario en SQL.

### Operación

```bash
# Desarrollo
npm run dev

# Producción
npm run build --workspace=server
npm run start --workspace=server

# Cliente estático
npm run build --workspace=client   # genera client/dist
```

- Aplica las migraciones antes de arrancar una versión nueva.
- El seed (`npm run seed --workspace=server`) es solo para desarrollo: **recrea** el tablero "Kanban Demo".
- Health checks para sondas: `GET /api/health` y `GET /api/health/db`.
- Los logs de Fastify son la fuente principal de diagnóstico; en producción conviene enviarlos a un colector y alertar sobre errores 5xx.
- Programa copias de seguridad de PostgreSQL. La base contiene usuarios, tableros y hashes de refresh tokens.
- El rate limiting es en memoria: con varias instancias del servidor cada una lleva su propio contador. Detrás de un proxy inverso, configura `trustProxy` para limitar por IP real.
- La documentación Swagger (`/docs`) está expuesta por defecto; restringe su acceso en producción si no es necesaria.

### Recomendaciones pendientes

- Publicar siempre detrás de HTTPS y un proxy inverso.
- Añadir tests automatizados de API y de integración.
- Valorar rate limiting global, bloqueo progresivo de login y listado/revocación de sesiones activas.
- Configurar monitorización, alertas y rotación periódica de secretos.

## Estado del proyecto

- **Servidor**: API funcional con autenticación, autorización por roles, validación, rate limiting, documentación OpenAPI y datos de ejemplo.
- **Cliente**: SPA funcional con login/registro, tableros, columnas, cards, drag & drop, roles y diseño responsive.

Consulta `server/README.md` para el detalle completo de endpoints, permisos y flujos de prueba.
