export type CardPriority = "low" | "medium" | "high";
export type BoardRole = "owner" | "admin" | "member";

export type AuthUser = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicUser = Pick<AuthUser, "id" | "email" | "username" | "name">;

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type RegisterInput = {
  email: string;
  username: string;
  name?: string;
  password: string;
};

export type Board = {
  id: number;
  name: string;
  ownerId: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BoardMember = {
  id: number;
  role: Exclude<BoardRole, "owner">;
  userId: number;
  boardId: number;
  user: PublicUser | null;
};

export type AddMemberInput = {
  boardId: number;
  email?: string;
  username?: string;
  role?: Exclude<BoardRole, "owner">;
};

export type Card = {
  id: number;
  title: string;
  description: string | null;
  position: number;
  priority: CardPriority;
  dueDate: string | null;
  columnId: number;
  assigneeId: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BoardColumn = {
  id: number;
  name: string;
  position: number;
  boardId: number;
  cards: Card[];
  createdAt?: string;
  updatedAt?: string;
};

export type FullBoard = Board & {
  owner: PublicUser | null;
  members: BoardMember[];
  columns: BoardColumn[];
};

export type CreateCardInput = {
  title: string;
  description?: string | null;
  position: number;
  priority?: CardPriority;
  columnId: number;
  assigneeId?: number | null;
  dueDate?: string | null;
};

export type UpdateCardInput = Partial<
  Pick<CreateCardInput, "title" | "description" | "priority" | "assigneeId" | "dueDate">
>;
