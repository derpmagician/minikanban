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




# Pruebas de API — MiniKanban

Base URL:

```text
http://localhost:3000
```

> Todos los comandos están pensados para ejecutarse desde PowerShell.

---

# 1. Health Check

## 1.1 Comprobar que la API está funcionando

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "status": "ok"
}
```

---

## 1.2 Comprobar conexión con PostgreSQL

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/health/db
```

Respuesta esperada:

```json
{
  "status": "ok",
  "database": "ok"
}
```

---

# 2. Auth

## 2.1 Registrar usuario

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/auth/register `
  -ContentType "application/json" `
  -Body '{
    "email": "usuario3@test.com",
    "username": "usuario3",
    "name": "Usuario Tres",
    "password": "Password123"
  }'
```

Respuesta esperada:

```json
{
  "id": 4,
  "email": "usuario3@test.com",
  "username": "usuario3",
  "name": "Usuario Tres"
}
```

> El `passwordHash` nunca debe aparecer en la respuesta.

---

## 2.2 Login

```powershell
$login = Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/auth/login `
  -ContentType "application/json" `
  -Body '{
    "email": "usuario3@test.com",
    "password": "Password123"
  }'
```

Ver el resultado:

```powershell
$login
```

La respuesta contiene:

```text
accessToken
user
```

---

## 2.3 Guardar solamente el access token

```powershell
$token = $login.accessToken
```

Comprobar:

```powershell
$token
```

---

# 3. Boards

## 3.1 Obtener todos los boards sin autenticación

Esta prueba sirve para comprobar que la protección JWT funciona.

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/boards
```

Respuesta esperada:

```text
401 Unauthorized
```

---

## 3.2 Obtener todos los boards autenticado

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/boards `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

También se puede utilizar directamente:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/boards `
  -Headers @{
    Authorization = "Bearer $($login.accessToken)"
  }
```

---

## 3.3 Crear un board

> Actualmente estamos modificando el endpoint para que `ownerId` salga del JWT. Por tanto, el cliente solamente debe enviar `name`.

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/boards `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "name": "Mi nuevo Kanban"
  }'
```

El `ownerId` debe ser asignado por el backend usando:

```ts
request.user.userId
```

---

## 3.4 Obtener un board por ID

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/boards/1 `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

Cambiar `1` por el ID del board.

---

## 3.5 Obtener un board completo

Devuelve el board junto con sus miembros, columnas y cards.

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/boards/1/full `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

---

## 3.6 Actualizar un board

```powershell
Invoke-RestMethod `
  -Method PUT `
  -Uri http://localhost:3000/api/boards/1 `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "name": "Kanban actualizado"
  }'
```

---

## 3.7 Eliminar un board

```powershell
Invoke-RestMethod `
  -Method DELETE `
  -Uri http://localhost:3000/api/boards/1 `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

Respuesta esperada:

```json
{
  "success": true
}
```

---

# 4. Columns

## 4.1 Crear una columna

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/columns `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "name": "Pendiente",
    "position": 0,
    "boardId": 1
  }'
```

Crear otra:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/columns `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "name": "En Progreso",
    "position": 1,
    "boardId": 1
  }'
```

Y otra:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/columns `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "name": "Terminado",
    "position": 2,
    "boardId": 1
  }'
```

---

## 4.2 Obtener columnas de un board

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/columns/board/1 `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

---

## 4.3 Actualizar una columna

```powershell
Invoke-RestMethod `
  -Method PUT `
  -Uri http://localhost:3000/api/columns/1 `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "name": "Por hacer",
    "position": 0
  }'
```

---

## 4.4 Eliminar una columna

```powershell
Invoke-RestMethod `
  -Method DELETE `
  -Uri http://localhost:3000/api/columns/1 `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

Respuesta:

```json
{
  "success": true
}
```

---

# 5. Cards

## 5.1 Crear una card

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/cards `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "title": "Implementar login",
    "description": "Crear autenticación con JWT",
    "position": 0,
    "priority": "high",
    "columnId": 1
  }'
```

---

## 5.2 Crear una card con usuario asignado

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/cards `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "title": "Implementar frontend",
    "description": "Crear interfaz del Kanban",
    "position": 1,
    "priority": "medium",
    "columnId": 1,
    "assigneeId": 4
  }'
```

---

## 5.3 Crear una card con fecha límite

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/cards `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "title": "Entregar proyecto",
    "position": 2,
    "priority": "high",
    "columnId": 1,
    "dueDate": "2026-10-15T23:59:59Z"
  }'
```

---

## 5.4 Obtener cards de una columna

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/cards/column/1 `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

---

## 5.5 Actualizar una card

```powershell
Invoke-RestMethod `
  -Method PUT `
  -Uri http://localhost:3000/api/cards/1 `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "title": "Implementar login JWT",
    "description": "Login terminado con JWT",
    "priority": "high"
  }'
```

---

## 5.6 Mover una card

Por ejemplo, mover la card `1` a la columna `2`:

```powershell
Invoke-RestMethod `
  -Method PATCH `
  -Uri http://localhost:3000/api/cards/1/move `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "columnId": 2,
    "position": 0
  }'
```

---

## 5.7 Eliminar una card

```powershell
Invoke-RestMethod `
  -Method DELETE `
  -Uri http://localhost:3000/api/cards/1 `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

Respuesta:

```json
{
  "success": true
}
```

---

# 6. Board Members

## 6.1 Agregar un miembro al board

Por ejemplo, agregar el usuario `4` al board `1` como miembro:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/members `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "userId": 4,
    "boardId": 1,
    "role": "member"
  }'
```

Para administrador:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/members `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "userId": 4,
    "boardId": 1,
    "role": "admin"
  }'
```

> Actualmente esta ruta todavía necesita autorización basada en propietario/rol. No debemos confiar únicamente en el `userId` enviado por el cliente.

---

## 6.2 Obtener miembros de un board

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/members/board/1 `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

---

## 6.3 Eliminar un miembro

```powershell
Invoke-RestMethod `
  -Method DELETE `
  -Uri http://localhost:3000/api/members/1 `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

---

# 7. Flujo completo de prueba

Una prueba completa desde cero puede hacerse así.

## Paso 1 — Registrar usuario

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/auth/register `
  -ContentType "application/json" `
  -Body '{
    "email": "test@test.com",
    "username": "tester",
    "name": "Test User",
    "password": "Password123"
  }'
```

## Paso 2 — Login

```powershell
$login = Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/auth/login `
  -ContentType "application/json" `
  -Body '{
    "email": "test@test.com",
    "password": "Password123"
  }'
```

## Paso 3 — Guardar token

```powershell
$token = $login.accessToken
```

## Paso 4 — Crear board

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/boards `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "name": "Mi Kanban"
  }'
```

## Paso 5 — Obtener boards

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/boards `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

## Paso 6 — Crear columnas

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/columns `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "name": "Pendiente",
    "position": 0,
    "boardId": 1
  }'
```

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/columns `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "name": "En Progreso",
    "position": 1,
    "boardId": 1
  }'
```

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/columns `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "name": "Terminado",
    "position": 2,
    "boardId": 1
  }'
```

## Paso 7 — Crear card

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/cards `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "title": "Primera tarea",
    "description": "Probar nuestro Kanban",
    "position": 0,
    "priority": "medium",
    "columnId": 1
  }'
```

## Paso 8 — Obtener cards

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/cards/column/1 `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

## Paso 9 — Mover card

```powershell
Invoke-RestMethod `
  -Method PATCH `
  -Uri http://localhost:3000/api/cards/1/move `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "columnId": 2,
    "position": 0
  }'
```

## Paso 10 — Obtener board completo

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/boards/1/full `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

---

# 8. Variables útiles de PowerShell

Para no repetir el token:

```powershell
$token = $login.accessToken
```

Para guardar el ID del usuario:

```powershell
$userId = $login.user.id
```

Para guardar el ID de un board después de crearlo:

```powershell
$board = Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/boards `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body '{
    "name": "Mi Kanban"
  }'

$board.id
```

Y podemos guardarlo:

```powershell
$boardId = $board.id
```

Después:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/boards/$boardId" `
  -Headers @{
    Authorization = "Bearer $token"
  }
```

---

# 9. Resumen de endpoints

| Método | Endpoint                 | Operación            |
| ------ | ------------------------ | -------------------- |
| GET    | `/api/health`            | Health check         |
| GET    | `/api/health/db`         | Comprobar PostgreSQL |
| POST   | `/api/auth/register`     | Registrar usuario    |
| POST   | `/api/auth/login`        | Login + JWT          |
| GET    | `/api/boards`            | Listar boards        |
| POST   | `/api/boards`            | Crear board          |
| GET    | `/api/boards/:id`        | Obtener board        |
| GET    | `/api/boards/:id/full`   | Board completo       |
| PUT    | `/api/boards/:id`        | Actualizar board     |
| DELETE | `/api/boards/:id`        | Eliminar board       |
| POST   | `/api/columns`           | Crear columna        |
| GET    | `/api/columns/board/:id` | Listar columnas      |
| PUT    | `/api/columns/:id`       | Actualizar columna   |
| DELETE | `/api/columns/:id`       | Eliminar columna     |
| POST   | `/api/cards`             | Crear card           |
| GET    | `/api/cards/column/:id`  | Listar cards         |
| PUT    | `/api/cards/:id`         | Actualizar card      |
| PATCH  | `/api/cards/:id/move`    | Mover card           |
| DELETE | `/api/cards/:id`         | Eliminar card        |
| POST   | `/api/members`           | Agregar miembro      |
| GET    | `/api/members/board/:id` | Listar miembros      |
| DELETE | `/api/members/:id`       | Eliminar miembro     |

---

# 10. Estado actual de autenticación

Actualmente:

* `POST /api/auth/register` → público.
* `POST /api/auth/login` → público.
* JWT → funcionando.
* `GET /api/boards` → protegido con JWT.
* El token contiene `userId`.
* `request.user.userId` está disponible para el backend.
* Las demás rutas todavía deben recibir progresivamente la protección/autorización.
* `RefreshToken` ya existe en el contrato, pero todavía no hemos implementado el flujo de refresh.
* La autorización por `ownerId` y `BoardMember.role` todavía está pendiente.

El siguiente paso del backend es separar claramente **autenticación** (JWT) de **autorización** (propietario/admin/member).
