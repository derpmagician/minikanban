import argon2 from "argon2";

import { db } from "../prisma/db.js";
import {
  rewriteCardPositions,
  rewriteColumnPositions,
  sortByPosition,
} from "../utils/positions.js";

const DEMO_EMAIL = "demo@minikanban.dev";
const DEMO_PASSWORD = "Demo1234";
const DEMO_BOARD_NAME = "Kanban Demo";

type SeedCard = {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueInDays?: number;
  assigned?: boolean;
};

type SeedColumn = {
  name: string;
  cards: SeedCard[];
};

const DEMO_COLUMNS: SeedColumn[] = [
  {
    name: "Backlog",
    cards: [
      {
        title: "Diseñar la pantalla del tablero",
        description: "Wireframe y composición de los componentes",
        priority: "medium",
      },
      {
        title: "Definir paleta de colores",
        priority: "low",
        assigned: true,
      },
      {
        title: "Añadir búsqueda de cards",
        priority: "low",
      },
    ],
  },
  {
    name: "En Progreso",
    cards: [
      {
        title: "Implementar drag & drop con dnd-kit",
        priority: "high",
        dueInDays: 5,
        assigned: true,
      },
      {
        title: "Conectar el login con /api/auth/login",
        description: "Access token en memoria + refresh con cookies",
        priority: "high",
        dueInDays: 2,
      },
    ],
  },
  {
    name: "En Revisión",
    cards: [
      {
        title: "Revisar validaciones de la API",
        priority: "medium",
        assigned: true,
      },
    ],
  },
  {
    name: "Terminado",
    cards: [
      {
        title: "Montar el proyecto con Vite + React",
        priority: "medium",
        dueInDays: -3,
      },
      {
        title: "Configurar CORS con cookies",
        priority: "low",
        dueInDays: -1,
      },
    ],
  },
];

function countChanges<T extends { position: number }>(rows: T[]) {
  return rows.filter((row, index) => row.position !== index).length;
}

// Reescribe las posiciones de todos los boards para que queden
// 0..n-1 sin huecos ni duplicados.
async function normalizePositions() {
  const boards = await db.orm.public.Board.all();

  let columnChanges = 0;
  let cardChanges = 0;

  for (const board of boards) {
    const columns = sortByPosition(
      await db.orm.public.BoardColumn
        .where({
          boardId: board.id,
        })
        .all(),
    );

    columnChanges += countChanges(columns);

    await rewriteColumnPositions(db, columns);

    for (const column of columns) {
      const cards = sortByPosition(
        await db.orm.public.Card
          .where({
            columnId: column.id,
          })
          .all(),
      );

      cardChanges += countChanges(cards);

      await rewriteCardPositions(db, cards);
    }
  }

  console.log(
    `Posiciones normalizadas: ${columnChanges} columnas y ${cardChanges} cards actualizadas`,
  );
}

async function ensureDemoUser() {
  const existing = await db.orm.public.User
    .where({
      email: DEMO_EMAIL,
    })
    .first();

  if (existing) {
    console.log(`Usuario demo ya existe: ${DEMO_EMAIL}`);
    return existing;
  }

  const passwordHash = await argon2.hash(DEMO_PASSWORD, {
    type: argon2.argon2id,
  });

  const user = await db.orm.public.User.create({
    email: DEMO_EMAIL,
    username: "demo",
    name: "Usuario Demo",
    passwordHash,
  });

  console.log(`Usuario demo creado: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

  return user;
}

async function createDemoBoard(ownerId: number) {
  const boards = await db.orm.public.Board
    .where({
      ownerId,
    })
    .all();

  const previous = boards.find((board) => board.name === DEMO_BOARD_NAME);

  if (previous) {
    await db.orm.public.Board
      .where({
        id: previous.id,
      })
      .delete();

    console.log(`Board anterior "${DEMO_BOARD_NAME}" eliminado (se recrea)`);
  }

  const board = await db.orm.public.Board.create({
    name: DEMO_BOARD_NAME,
    ownerId,
  });

  const now = Temporal.Now.instant();
  let cardCount = 0;

  for (let columnIndex = 0; columnIndex < DEMO_COLUMNS.length; columnIndex++) {
    const seedColumn = DEMO_COLUMNS[columnIndex];

    if (!seedColumn) {
      continue;
    }

    const column = await db.orm.public.BoardColumn.create({
      name: seedColumn.name,
      position: columnIndex,
      boardId: board.id,
    });

    for (let cardIndex = 0; cardIndex < seedColumn.cards.length; cardIndex++) {
      const seedCard = seedColumn.cards[cardIndex];

      if (!seedCard) {
        continue;
      }

      await db.orm.public.Card.create({
        title: seedCard.title,
        description: seedCard.description ?? null,
        position: cardIndex,
        priority: seedCard.priority ?? "medium",
        columnId: column.id,
        assigneeId: seedCard.assigned ? ownerId : null,
        dueDate: seedCard.dueInDays === undefined
          ? null
          : now.add({ hours: seedCard.dueInDays * 24 }),
      });

      cardCount++;
    }
  }

  console.log(
    `Board "${DEMO_BOARD_NAME}" creado: ${DEMO_COLUMNS.length} columnas y ${cardCount} cards`,
  );

  return board;
}

// Agrega otro usuario existente como miembro, para tener
// membresías de ejemplo en el tablero.
async function ensureDemoMember(boardId: number, ownerId: number) {
  const users = await db.orm.public.User.all();

  const other = users.find((user) => user.id !== ownerId);

  if (!other) {
    return;
  }

  const existing = await db.orm.public.BoardMember
    .where({
      boardId,
      userId: other.id,
    })
    .first();

  if (existing) {
    return;
  }

  await db.orm.public.BoardMember.create({
    userId: other.id,
    boardId,
    role: "member",
  });

  console.log(`Miembro agregado al board demo: ${other.email} (member)`);
}

async function main() {
  await normalizePositions();

  const demoUser = await ensureDemoUser();

  const board = await createDemoBoard(demoUser.id);

  await ensureDemoMember(board.id, demoUser.id);
}

try {
  await main();
} catch (error) {
  console.error("Error en el seed:", error);
  process.exitCode = 1;
} finally {
  await db.close();
}
