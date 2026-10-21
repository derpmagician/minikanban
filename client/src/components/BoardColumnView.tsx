import { useEffect, useState } from "react";

import {
  PRIORITY_LABELS,
  formatShortDate,
  isOverdue,
} from "../lib/format";
import type { BoardColumn, Card } from "../lib/types";
import { CalendarIcon, PencilIcon, PlusIcon, TrashIcon } from "./Icons";

type BoardColumnViewProps = {
  column: BoardColumn;
  accent: string;
  canManage: boolean;
  draggingCardId: number | null;
  onAddCard: () => void;
  onEditCard: (card: Card) => void;
  onEditColumn: () => void;
  onDeleteColumn: () => void;
  onDragStart: (card: Card) => void;
  onDragEnd: () => void;
  onDropCard: (columnId: number, beforeCardId?: number) => void;
};

type DropTarget = number | "end" | null;

export function BoardColumnView({
  column,
  accent,
  canManage,
  draggingCardId,
  onAddCard,
  onEditCard,
  onEditColumn,
  onDeleteColumn,
  onDragStart,
  onDragEnd,
  onDropCard,
}: BoardColumnViewProps) {
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);

  useEffect(() => {
    if (draggingCardId === null) {
      setDropTarget(null);
    }
  }, [draggingCardId]);

  const handleDrop = (beforeCardId?: number) => {
    onDropCard(column.id, beforeCardId);
    setDropTarget(null);
  };

  return (
    <section
      className={`kanban-column${dropTarget !== null ? " kanban-column--over" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropTarget("end");
      }}
      onDrop={(event) => {
        event.preventDefault();
        handleDrop();
      }}
    >
      <header className="kanban-column__header">
        <div className="kanban-column__title">
          <span className="kanban-column__accent" style={{ background: accent }} />
          <h2>{column.name}</h2>
          <span className="kanban-column__count">{column.cards.length}</span>
        </div>

        {canManage ? (
          <div className="kanban-column__actions">
            <button
              type="button"
              className="icon-button icon-button--small"
              onClick={onEditColumn}
              aria-label={`Renombrar columna ${column.name}`}
              title="Renombrar columna"
            >
              <PencilIcon size={15} />
            </button>
            <button
              type="button"
              className="icon-button icon-button--small icon-button--danger"
              onClick={onDeleteColumn}
              aria-label={`Eliminar columna ${column.name}`}
              title="Eliminar columna"
            >
              <TrashIcon size={15} />
            </button>
          </div>
        ) : null}
      </header>

      <div
        className={`kanban-column__cards${
          dropTarget === "end" && draggingCardId !== null
            ? " kanban-column__cards--drop-end"
            : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropTarget("end");
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleDrop();
        }}
      >
        {column.cards.length === 0 ? (
          <p className="kanban-column__empty">
            {draggingCardId !== null ? "Suelta la card aquí" : "Sin cards todavía"}
          </p>
        ) : null}

        {column.cards.map((card) => {
          const overdue = isOverdue(card.dueDate);
          const isDragging = draggingCardId === card.id;

          return (
            <article
              key={card.id}
              className={[
                "kanban-card",
                isDragging ? "kanban-card--dragging" : "",
                dropTarget === card.id && !isDragging ? "kanban-card--drop-before" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable
              onClick={() => onEditCard(card)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(card.id));
                onDragStart(card);
              }}
              onDragEnd={onDragEnd}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = "move";
                setDropTarget(card.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleDrop(card.id);
              }}
            >
              <div className="kanban-card__top">
                <span className={`priority priority--${card.priority}`}>
                  {PRIORITY_LABELS[card.priority]}
                </span>
                {card.dueDate ? (
                  <span className={`card-date${overdue ? " card-date--overdue" : ""}`}>
                    <CalendarIcon size={13} />
                    {formatShortDate(card.dueDate)}
                  </span>
                ) : null}
              </div>

              <h3>{card.title}</h3>

              {card.description ? (
                <p className="kanban-card__description">{card.description}</p>
              ) : null}
            </article>
          );
        })}

        {dropTarget === "end" && draggingCardId !== null && column.cards.length > 0 ? (
          <div className="drop-line" />
        ) : null}
      </div>

      <button type="button" className="add-card-button" onClick={onAddCard}>
        <PlusIcon size={16} />
        Añadir card
      </button>
    </section>
  );
}
