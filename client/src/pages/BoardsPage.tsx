import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";

import { AppHeader } from "../components/AppHeader";
import { NameDialog } from "../components/NameDialog";
import { ArrowRightIcon, LayersIcon, PlusIcon } from "../components/Icons";
import { api, getErrorMessage } from "../lib/api";
import { formatShortDate } from "../lib/format";
import { useAuthStore } from "../store/auth";

export function BoardsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const boardsQuery = useQuery({
    queryKey: ["boards"],
    queryFn: api.boards.list,
  });

  const createBoard = useMutation({
    mutationFn: (name: string) => api.boards.create(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const boards = boardsQuery.data ?? [];
  const displayName = user?.name ?? user?.username ?? "de nuevo";

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Tus espacios de trabajo</p>
            <h1>Hola, {displayName}</h1>
            <p className="page-subtitle">
              Elige un tablero para seguir trabajando o crea uno nuevo.
            </p>
          </div>

          <button
            type="button"
            className="button button--primary"
            onClick={() => setCreating(true)}
          >
            <PlusIcon size={17} />
            Nuevo tablero
          </button>
        </header>

        {boardsQuery.isPending ? (
          <div className="boards-grid">
            {[0, 1, 2].map((index) => (
              <div key={index} className="board-card board-card--skeleton" />
            ))}
          </div>
        ) : null}

        {boardsQuery.isError ? (
          <div className="empty-state">
            <h2>No pudimos cargar tus tableros</h2>
            <p>{getErrorMessage(boardsQuery.error)}</p>
            <button
              type="button"
              className="button button--primary"
              onClick={() => void boardsQuery.refetch()}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {boardsQuery.isSuccess && boards.length === 0 ? (
          <div className="empty-state empty-state--board">
            <span className="empty-state__icon">
              <LayersIcon size={30} />
            </span>
            <h2>Tu primer tablero te espera</h2>
            <p>
              Crea un tablero, añade columnas y empieza a mover cards. Así de
              simple.
            </p>
            <button
              type="button"
              className="button button--primary"
              onClick={() => setCreating(true)}
            >
              <PlusIcon size={17} />
              Crear tablero
            </button>
          </div>
        ) : null}

        {boards.length > 0 ? (
          <div className="boards-grid">
            {boards.map((board) => {
              const isOwner = board.ownerId === user?.id;

              return (
                <Link
                  key={board.id}
                  to={`/boards/${board.id}`}
                  className="board-card"
                >
                  <div className="board-card__top">
                    <span className="board-card__icon">
                      <LayersIcon size={22} />
                    </span>
                    <span className={`badge${isOwner ? " badge--owner" : ""}`}>
                      {isOwner ? "Propietario" : "Miembro"}
                    </span>
                  </div>

                  <div>
                    <h2>{board.name}</h2>
                    <p>
                      {board.updatedAt
                        ? `Actualizado el ${formatShortDate(board.updatedAt)}`
                        : "Sin actividad reciente"}
                    </p>
                  </div>

                  <span className="board-card__cta">
                    Abrir tablero
                    <ArrowRightIcon size={16} />
                  </span>
                </Link>
              );
            })}

            <button
              type="button"
              className="board-card board-card--new"
              onClick={() => setCreating(true)}
            >
              <span className="board-card__plus">
                <PlusIcon size={22} />
              </span>
              <span>Crear otro tablero</span>
            </button>
          </div>
        ) : null}
      </main>

      {creating ? (
        <NameDialog
          title="Nuevo tablero"
          subtitle="Dale un nombre claro; podrás cambiarlo después."
          label="Nombre del tablero"
          placeholder="Ej. Producto Q4"
          submitLabel="Crear tablero"
          onSubmit={async (name) => {
            await createBoard.mutateAsync(name);
          }}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </div>
  );
}
