import { buildApp } from "./app.js";
import { db } from "./prisma/db.js";

const app = await buildApp();

try {
  await app.listen({
    port: 3000,
    host: "0.0.0.0",
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

// Cierre ordenado: deja de aceptar requests, cierra el servidor
// y el pool de la base de datos (el timer de limpieza lo corta
// el hook onClose de la app).
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    app.log.info(`Recibido ${signal}, cerrando servidor...`);

    try {
      await app.close();
      await db.close();
      process.exit(0);
    } catch (error) {
      app.log.error(error);
      process.exit(1);
    }
  });
}
