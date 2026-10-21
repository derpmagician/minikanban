import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";

import { AppHeader } from "../components/AppHeader";
import { BoardColumnView } from "../components/BoardColumnView";
import { CardDialog } from "../components/CardDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { NameDialog } from "../components/NameDialog";
import {
  ArrowLeftIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "../components/Icons";
import { api, getErrorMessage } from "../lib/api";
import { COLUMN_COLORS } from "../lib/format";
import type { BoardColumn, Card } from "../lib/types";
import { useAuthStore } from "../store/auth";

type CardDialogState = {
  column: BoardColumn;
  card?: Card;
};

type DraggedCard = {
  cardId: number;
  columnId: number;
};

export function BoardPage() {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const boardId = Number(params.boardId);

  const [dragged, setDragged] = useState<DraggedCard | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [renamingBoard, setRenamingBoard] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);
  const [editingColumn, setEditingColumn] = useState<BoardColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<BoardColumn | null>(null);
  const [cardDialog, setCardDialog] = useState<CardDialogState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const boardQuery = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => api.boards.full(boardId),
    enabled: Number.isFinite(boardId),
  });

  const board = boardQuery.data;

  const columns = useMemo(() => {
    const source = board?.columns ?? [];

    return [...source]
      .sort((left, right) => left.position - right.position)
      .map((column) => ({
        ...column,
        cards: [...column.cards].sort((left, right) => left.position - right.position),
      }));
  }, [board]);

  const invalidateBoard = () =>
    queryClient.invalidateQueries({ queryKey: ["board", boardId] });

  const invalidateEverything = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
      queryClient.invalidateQueries({ queryKey: ["boards"] }),
    ]);
  };

  const moveCard = useMutation({
    mutationFn: (input: { cardId: number; columnId: number; position: number }) =>
      api.cards.move(input.cardId, {
        columnId: input.columnId,
        position: input.position,
      }),
    onSuccess: () => {
      setActionError(null);
      void invalidateBoard();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const createColumn = useMutation({
    mutationFn: (name: string) =>
      api.columns.create({ name, position: columns.length, boardId }),
    onSuccess: () => {
      setActionError(null);
      void invalidateBoard();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const updateColumn = useMutation({
    mutationFn: (input: { column: BoardColumn; name: string }) =>
      api.columns.update(input.column.id, {
        name: input.name,
        position: input.column.position,
      }),
    onSuccess: () => {
      setActionError(null);
      void invalidateBoard();
    },
  });

  const deleteColumn = useMutation({
    mutationFn: (columnId: number) => api.columns.remove(columnId),
    onSuccess: () => {
      setActionError(null);
      void invalidateBoard();
    },
  });

  const renameBoard = useMutation({
    mutationFn: (name: string) => api.boards.update(boardId, name),
    onSuccess: () => {
      setActionError(null);
      void invalidateEverything();
    },
  });

  const deleteBoard = useMutation({
    mutationFn: () => api.boards.remove(boardId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["boards"] });
      navigate("/", { replace: true });
    },
  });

  const isOwner = board?.ownerId === user?.id;
  const memberRole = board?.members.find((member) => member.userId === user?.id)?.role;
  const role = isOwner ? "owner" : memberRole;
  const canManage = role === "owner" || role === "admin";
  const memberCount = board ? board.members.length + 1 : 0;
  const cardCount = columns.reduce((total, column) => total + column.cards.length, 0);

  const handleDropCard = (targetColumnId: number, beforeCardId?: number) => {
    const source = dragged;
    setDragged(null);

    if (!source) {
      return;
    }

    if (source.cardId === beforeCardId) {
      return;
    }

    const targetColumn = columns.find((column) => column.id === targetColumnId);

    if (!targetColumn) {
      return;
    }

    const targetCards = targetColumn.cards.filter((card) => card.id !== source.cardId);

    let position = targetCards.length;

    if (beforeCardId !== undefined) {
      const beforeIndex = targetCards.findIndex((card) => card.id === beforeCardId);
      position = beforeIndex === -1 ? targetCards.length : beforeIndex;
    }

    if (source.columnId === targetColumnId) {
      const sourceColumn = columns.find((column) => column.id === source.columnId);
      const currentIndex = sourceColumn?.cards.findIndex(
        (card) => card.id === source.cardId,
      );

      if (currentIndex === position) {
        return;
      }
    }

    moveCard.mutate({
      cardId: source.cardId,
      columnId: targetColumnId,
      position,
    });
  };

  const handleEditCard = (column: BoardColumn, card: Card) => {
    setCardDialog({ column, card });
  };

  return (
    <div className="app-shell">
      <AppHeader />

      {boardQuery.isPending ? (
        <main className="page page--board">
          <div className="board-skeleton">
            <div className="board-skeleton__header" />
            <div className="board-skeleton__columns">
              {[0, 1, 2].map((index) => (
                <div key={index} className="board-skeleton__column" />
              ))}
            </div>
          </div>
        </main>
      ) : null}

      {boardQuery.isError ? (
        <main className="page">
          <div className="empty-state">
            <h2>No pudimos abrir este tablero</h2>
            <p>{getErrorMessage(boardQuery.error)}</p>
            <Link to="/" className="button button--primary">
              Volver a tableros
            </Link>
          </div>
        </main>
      ) : null}

      {board ? (
        <main className="page page--board">
          <header className="board-header">
            <div className="board-header__main">
              <Link to="/" className="button button--ghost button--small">
                <ArrowLeftIcon size={16} />
                Tableros
              </Link>

              <div className="board-header__title">
                <h1>{board.name}</h1>
                <div className="board-meta">
                  <span>
                    {columns.length} {columns.length === 1 ? "columna" : "columnas"}
                  </span>
                  <span>
                    {cardCount} {cardCount === 1 ? "card" : "cards"}
                  </span>
                  <span title="Incluye al propietario">
                    <UsersIcon size={14} />
                    {memberCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="board-header__actions">
              {canManage ? (
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => setRenamingBoard(true)}
                >
                  <PencilIcon size={15} />
                  Renombrar
                </button>
              ) : null}

              {isOwner ? (
                <button
                  type="button"
                  className="button button--ghost button--small button--danger-text"
                  onClick={() => setDeletingBoard(true)}
                >
                  <TrashIcon size={15} />
                  Eliminar
                </button>
              ) : null}
            </div>
          </header>

          {actionError ? (
            <div className="notice" role="alert">
              <span>{actionError}</span>
              <button
                type="button"
                className="icon-button icon-button--small"
                onClick={() => setActionError(null)}
                aria-label="Descartar aviso"
              >
                <XIcon size={15} />
              </button>
            </div>
          ) : null}

          {columns.length === 0 ? (
            <div className="empty-state empty-state--inline">
              <h2>Este tablero está vacío</h2>
              <p>Crea tu primera columna para empezar a organizar el trabajo.</p>
              <button
                type="button"
                className="button button--primary"
                onClick={() => setAddingColumn(true)}
              >
                <PlusIcon size={17} />
                Crear columna
              </button>
            </div>
          ) : (
            <div className="board-canvas">
              {columns.map((column, index) => (
                <BoardColumnView
                  key={column.id}
                  column={column}
                  accent={COLUMN_COLORS[index % COLUMN_COLORS.length]!}
                  canManage={canManage}
                  draggingCardId={dragged?.cardId ?? null}
                  onAddCard={() => setCardDialog({ column })}
                  onEditCard={(card) => handleEditCard(column, card)}
                  onEditColumn={() => setEditingColumn(column)}
                  onDeleteColumn={() => setDeletingColumn(column)}
                  onDragStart={(card) =>
                    setDragged({ cardId: card.id, columnId: card.columnId })
                  }
                  onDragEnd={() => setDragged(null)}
                  onDropCard={handleDropCard}
                />
              ))}

              <button
                type="button"
                className="add-column-button"
                onClick={() => setAddingColumn(true)}
              >
                <PlusIcon size={18} />
                Añadir columna
              </button>
            </div>
          )}
        </main>
      ) : null}

      {addingColumn ? (
        <NameDialog
          title="Nueva columna"
          subtitle="Las columnas representan las etapas de tu flujo."
          label="Nombre de la columna"
          placeholder="Ej. En revisión"
          submitLabel="Crear columna"
          onSubmit={async (name) => {
            await createColumn.mutateAsync(name);
          }}
          onClose={() => setAddingColumn(false)}
        />
      ) : null}

      {editingColumn ? (
        <NameDialog
          title="Renombrar columna"
          label="Nombre de la columna"
          initialValue={editingColumn.name}
          submitLabel="Guardar"
          onSubmit={async (name) => {
            await updateColumn.mutateAsync({ column: editingColumn, name });
          }}
          onClose={() => setEditingColumn(null)}
        />
      ) : null}

      {deletingColumn ? (
        <ConfirmDialog
          title="Eliminar columna"
          message={
            deletingColumn.cards.length > 0
              ? `La columna "${deletingColumn.name}" y sus ${deletingColumn.cards.length} cards se eliminarán definitivamente.`
              : `La columna "${deletingColumn.name}" se eliminará definitivamente.`
          }
          onConfirm={async () => {
            await deleteColumn.mutateAsync(deletingColumn.id);
          }}
          onClose={() => setDeletingColumn(null)}
        />
      ) : null}

      {cardDialog ? (
        <CardDialog
          boardId={boardId}
          column={cardDialog.column}
          card={cardDialog.card}
          onClose={() => setCardDialog(null)}
        />
      ) : null}

      {renamingBoard ? (
        <NameDialog
          title="Renombrar tablero"
          label="Nombre del tablero"
          initialValue={board?.name ?? ""}
          submitLabel="Guardar"
          onSubmit={async (name) => {
            await renameBoard.mutateAsync(name);
          }}
          onClose={() => setRenamingBoard(false)}
        />
      ) : null}

      {deletingBoard ? (
        <ConfirmDialog
          title="Eliminar tablero"
          message={`El tablero "${board?.name ?? ""}" y todo su contenido se eliminarán definitivamente.`}
          onConfirm={async () => {
            await deleteBoard.mutateAsync();
          }}
          onClose={() => setDeletingBoard(false)}
        />
      ) : null}
    </div>
  );
}
