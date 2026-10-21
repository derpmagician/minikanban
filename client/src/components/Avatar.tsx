const AVATAR_COLORS = [
  "#1f6f5c",
  "#3b5bdb",
  "#b45309",
  "#9d174d",
  "#5b21b6",
  "#0e7490",
];

function hash(value: string): number {
  let result = 0;

  for (let index = 0; index < value.length; index++) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(result);
}

function initials(value: string): string {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function Avatar({
  name,
  id,
  size = 34,
}: {
  name: string;
  id?: number;
  size?: number;
}) {
  const colorIndex = (id ?? hash(name)) % AVATAR_COLORS.length;

  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: AVATAR_COLORS[colorIndex],
        fontSize: Math.round(size * 0.36),
      }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
