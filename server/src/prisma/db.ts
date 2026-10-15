import 'dotenv/config';
// El codec pg/timestamptz-temporal@1 necesita Temporal global.
// Node aún no lo expone sin flag, así que cargamos el polyfill
// antes de crear el cliente.
import 'temporal-polyfill/full/global';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});
