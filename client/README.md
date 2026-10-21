# MiniKanban — cliente

SPA en React 19 + TypeScript + Vite para gestionar tableros Kanban. Consume la API del servidor y usa React Router, TanStack Query y Zustand.

## Requisitos

- Node.js 24 LTS o superior (incluye npm)
- El servidor de MiniKanban en marcha

## Desarrollo

Desde la raíz del repositorio:

```bash
npm install
npm run dev --workspace=client
```

La aplicación queda en <http://localhost:5173>. Por defecto apunta a `http://localhost:3000`; para usar otra API define `VITE_API_URL` en un archivo `.env` dentro de `client/`:

```env
VITE_API_URL="http://localhost:3000"
```

También puedes ejecutar los comandos desde `client/` con `npm run dev`, `npm run build` y `npm run preview`.

## Funcionalidad

- Login, registro y sesión persistente con refresh token.
- Listado, creación y gestión de tableros.
- Columnas y cards con drag & drop nativo, prioridades, fechas límite y responsable.
- Panel de miembros para invitar por email o usuario, cambiar roles y quitar accesos.

Consulta el [README principal](../README.md) para la puesta en marcha completa, la API y los permisos.
