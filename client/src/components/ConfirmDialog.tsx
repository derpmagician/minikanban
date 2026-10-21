import { useState } from "react";

import { getErrorMessage } from "../lib/api";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Eliminar",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const handleConfirm = async () => {
    setWorking(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (confirmError) {
      setError(getErrorMessage(confirmError));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} width={420}>
      <p className="confirm-message">{message}</p>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="modal__actions">
        <button type="button" className="button button--ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="button button--danger"
          onClick={handleConfirm}
          disabled={working}
        >
          {working ? "Eliminando..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
