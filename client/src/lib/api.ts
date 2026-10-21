import type {
  AddMemberInput,
  AuthResponse,
  AuthUser,
  Board,
  BoardMember,
  CreateCardInput,
  FullBoard,
  RegisterInput,
  UpdateCardInput,
} from "./types";

const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000"
).replace(/\/$/, "");

type ApiIssue = {
  path?: (string | number)[];
  message?: string;
};

type ApiErrorBody = {
  error?: string;
  issues?: ApiIssue[];
};

export class ApiError extends Error {
  readonly status: number;
  readonly issues: ApiIssue[] | undefined;

  constructor(message: string, status: number, issues?: ApiIssue[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ha ocurrido un error inesperado";
}

let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

function handleUnauthorized() {
  accessToken = null;
  unauthorizedHandler?.();
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;

  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = null;
  }

  const issueMessages =
    body?.issues
      ?.map((issue) => issue.message)
      .filter((message): message is string => Boolean(message)) ?? [];

  const message =
    issueMessages.length > 0
      ? issueMessages.join(". ")
      : (body?.error ?? `Error ${response.status}`);

  return new ApiError(message, response.status, body?.issues);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con la API. Comprueba que el servidor está en marcha.",
      0,
    );
  }

  if (response.status === 401 && retry && !path.startsWith("/api/auth/")) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return request<T>(path, options, false);
    }

    handleUnauthorized();
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  return (text ? JSON.parse(text) : undefined) as T;
}

async function refreshAccessToken(): Promise<AuthResponse | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });

        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as AuthResponse;
        accessToken = data.accessToken;

        return data;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export const api = {
  auth: {
    login(email: string, password: string) {
      return request<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    register(input: RegisterInput) {
      return request<AuthUser>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    refresh() {
      return refreshAccessToken();
    },

    logout() {
      return request<{ success: boolean }>("/api/auth/logout", {
        method: "POST",
        body: "{}",
      });
    },
  },

  boards: {
    list() {
      return request<Board[]>("/api/boards");
    },

    create(name: string) {
      return request<Board>("/api/boards", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },

    full(boardId: number) {
      return request<FullBoard>(`/api/boards/${boardId}/full`);
    },

    update(boardId: number, name: string) {
      return request<Board>(`/api/boards/${boardId}`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
    },

    remove(boardId: number) {
      return request<{ success: boolean }>(`/api/boards/${boardId}`, {
        method: "DELETE",
      });
    },
  },

  members: {
    list(boardId: number) {
      return request<BoardMember[]>(`/api/members/board/${boardId}`);
    },

    add(input: AddMemberInput) {
      return request<BoardMember>("/api/members", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    updateRole(memberId: number, role: BoardMember["role"]) {
      return request<BoardMember>(`/api/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
    },

    remove(memberId: number) {
      return request<{ success: boolean }>(`/api/members/${memberId}`, {
        method: "DELETE",
      });
    },
  },

  columns: {
    create(input: { name: string; position: number; boardId: number }) {
      return request(`/api/columns`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    update(columnId: number, input: { name: string; position: number }) {
      return request(`/api/columns/${columnId}`, {
        method: "PUT",
        body: JSON.stringify(input),
      });
    },

    remove(columnId: number) {
      return request<{ success: boolean }>(`/api/columns/${columnId}`, {
        method: "DELETE",
      });
    },
  },

  cards: {
    create(input: CreateCardInput) {
      return request(`/api/cards`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    update(cardId: number, input: UpdateCardInput) {
      return request(`/api/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify(input),
      });
    },

    move(cardId: number, input: { columnId: number; position: number }) {
      return request(`/api/cards/${cardId}/move`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },

    remove(cardId: number) {
      return request<{ success: boolean }>(`/api/cards/${cardId}`, {
        method: "DELETE",
      });
    },
  },
};
