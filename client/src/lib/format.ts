import type { CardPriority } from "./types";

export const PRIORITY_LABELS: Record<CardPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const COLUMN_COLORS = [
  "#d97706",
  "#2563eb",
  "#7c3aed",
  "#0f766e",
  "#db2777",
  "#65a30d",
] as const;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00");

  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateInputValue(value: string | null | undefined): string {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

export function dateInputToIso(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatShortDate(value: string | null | undefined): string {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  const now = new Date();
  const includeYear = date.getFullYear() !== now.getFullYear();

  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(date);
}

export function isOverdue(value: string | null | undefined): boolean {
  const date = parseDate(value);

  if (!date) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date.getTime() < today.getTime();
}
