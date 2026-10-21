import { useState } from "react";
import type { FormEvent } from "react";

import { getErrorMessage } from "../lib/api";
import { Modal } from "./Modal";

type NameDialogProps = {
  title: string;
  subtitle?: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  submitLabel: string;
  onSubmit: (value: string) => Promise<void>;
  onClose: () => void;
};

export function NameDialog({
  title,
  subtitle,
  label,
  initialValue = "",
  placeholder,
  submitLabel,
  onSubmit,
  onClose,
}: NameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = value.trim();

    if (!trimmed) {
      setError("Escribe un nombre.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSubmit(trimmed);
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose} width={440}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>{label}</span>
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            maxLength={100}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="modal__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button button--primary" disabled={saving}>
            {saving ? "Guardando..." : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
