import { db } from "../prisma/db.js";

// El cliente puede ser `db` o el `tx` de una transacción.
export type PositionClient = Pick<typeof db, "orm">;

export type PositionedRow = {
  id: number;
  position: number;
};

// Orden estable por posición y, en empate, por id.
export function sortByPosition<T extends PositionedRow>(rows: T[]) {
  return [...rows].sort(
    (a, b) => a.position - b.position || a.id - b.id,
  );
}

// Limita un índice al rango [0, max].
export function clampIndex(index: number, max: number) {
  return Math.min(Math.max(index, 0), max);
}

// Reescribe las posiciones de un array ya ordenado:
// la fila en `startIndex` pasa a `startIndex + offset`, y así sucesivamente.
// Solo actualiza las filas cuya posición cambia.
async function rewritePositions(
  rows: PositionedRow[],
  startIndex: number,
  offset: number,
  update: (id: number, position: number) => Promise<unknown>,
) {
  for (let index = startIndex; index < rows.length; index++) {
    const row = rows[index];

    if (!row) {
      continue;
    }

    const position = index + offset;

    if (row.position !== position) {
      await update(row.id, position);
    }
  }
}

// Casos de uso:
// - Insertar en el índice p: rewrite(tx, rows, p, 1)
// - Eliminar en el índice d: rewrite(tx, rows, d + 1, -1)
// - Reordenar todo el array: rewrite(tx, rows)
export function rewriteCardPositions(
  client: PositionClient,
  cards: PositionedRow[],
  startIndex = 0,
  offset = 0,
) {
  return rewritePositions(cards, startIndex, offset, (id, position) =>
    client.orm.public.Card
      .where({ id })
      .update({ position }));
}

export function rewriteColumnPositions(
  client: PositionClient,
  columns: PositionedRow[],
  startIndex = 0,
  offset = 0,
) {
  return rewritePositions(columns, startIndex, offset, (id, position) =>
    client.orm.public.BoardColumn
      .where({ id })
      .update({ position }));
}
