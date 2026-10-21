import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";

import { api, getErrorMessage } from "../lib/api";
import {
  PRIORITY_LABELS,
  dateInputToIso,
  dateInputValue,
} from "../lib/format";
import type { BoardColumn, Card, CardPriority } from "../lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { TrashIcon } from "./Icons";
import { Modal } from "./Modal";

type CardDialogProps = {
  boardId: number;
  column: BoardColumn;
  card?: Card;
  onClose: () => void;
};

export function CardDialog({ boardId, column, card, onClose }: CardDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [priority, setPriority] = useState<CardPriority>(card?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(dateInputValue(card?.dueDate));
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const invalidateBoard = () =>
    queryClient.invalidateQueries({ queryKey: ["board", boardId] });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        priority,
        dueDate: dateInputToIso(dueDate),
      };

      if (card) {
        return await api.cards.update(card.id, payload);
      }

      return await api.cards.create({
        ...payload,
        columnId: column.id,
        position: column.cards.length,
      });
    },
    onSuccess: () => {
      void invalidateBoard();
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!card) {
        return;
      }

      await api.cards.remove(card.id);
    },
    onSuccess: () => {
      void invalidateBoard();
      onClose();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    save.mutate();
  };

  const error = save.error ?? remove.error;

  return (
    <>
      <Modal
        title={card ? "Editar card" : "Nueva card"}
        subtitle={`Columna ${column.name}`}
        onClose={onClose}
        width={560}
      >
        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Título</span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="¿Qué hay que hacer?"
              maxLength={200}
            />
          </label>

          <label className="field">
            <span>Descripción</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Añade contexto, criterios de aceptación o notas."
              rows={4}
              maxLength={5000}
            />
          </label>

          <div className="form-row">
            <label className="field">
              <span>Prioridad</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as CardPriority)}
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Fecha límite</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>

          {error ? <p className="form-error">{getErrorMessage(error)}</p> : null}

          <div className="modal__actions modal__actions--split">
            <div>
              {card ? (
                <button
                  type="button"
                  className="button button--danger-ghost"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <TrashIcon size={16} />
                  Eliminar
                </button>
              ) : null}
            </div>

            <div className="modal__actions-group">
              <button type="button" className="button button--ghost" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className="button button--primary"
                disabled={save.isPending || !title.trim()}
              >
                {save.isPending ? "Guardando..." : card ? "Guardar cambios" : "Crear card"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {confirmingDelete && card ? (
        <ConfirmDialog
          title="Eliminar card"
          message={`La card "${card.title}" se eliminará definitivamente.`}
          onConfirm={async () => {
            await remove.mutateAsync();
          }}
          onClose={() => setConfirmingDelete(false)}
        />
      ) : null}
    </>
  );
}
