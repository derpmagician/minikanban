import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError, api, getErrorMessage } from "../lib/api";
import type { AddMemberInput, BoardMember, PublicUser } from "../lib/types";
import { Avatar } from "./Avatar";
import { ConfirmDialog } from "./ConfirmDialog";
import { Modal } from "./Modal";
import { TrashIcon, UsersIcon } from "./Icons";

type MemberRole = BoardMember["role"];

type MembersDialogProps = {
  boardId: number;
  owner: PublicUser | null;
  members: BoardMember[];
  currentUserId: number | undefined;
  isOwner: boolean;
  canManage: boolean;
  onClose: () => void;
};

const ROLE_LABELS: Record<MemberRole | "owner", string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
};

function displayName(user: PublicUser | null, userId: number): string {
  return (
    user?.name?.trim() ||
    user?.username ||
    user?.email ||
    `Usuario #${userId}`
  );
}

function userDetails(user: PublicUser | null): string {
  if (!user) {
    return "";
  }

  return [
    user.username ? `@${user.username}` : null,
    user.email,
  ]
    .filter(Boolean)
    .join(" · ");
}

function getInviteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "No encontramos un usuario con ese email o nombre de usuario.";
    }

    if (error.status === 409) {
      return "Ese usuario ya pertenece al tablero.";
    }

    if (error.status === 400) {
      return "El propietario ya tiene acceso al tablero.";
    }
  }

  return getErrorMessage(error);
}

export function MembersDialog({
  boardId,
  owner,
  members,
  currentUserId,
  isOwner,
  canManage,
  onClose,
}: MembersDialogProps) {
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, MemberRole>>({});
  const [removingMember, setRemovingMember] = useState<BoardMember | null>(null);

  const invalidateBoard = () =>
    queryClient.invalidateQueries({ queryKey: ["board", boardId] });

  const addMember = useMutation({
    mutationFn: (input: AddMemberInput) => api.members.add(input),
    onSuccess: async () => {
      setIdentifier("");
      setInviteError(null);
      setSuccess("Miembro añadido al tablero.");
      await invalidateBoard();
    },
    onError: (error) => {
      setSuccess(null);
      setInviteError(getInviteError(error));
    },
  });

  const updateRole = useMutation({
    mutationFn: (input: { memberId: number; role: MemberRole }) =>
      api.members.updateRole(input.memberId, input.role),
    onSuccess: async (member) => {
      await invalidateBoard();
      setActionError(null);
      setRoleDrafts((drafts) => {
        const next = { ...drafts };
        delete next[member.id];
        return next;
      });
    },
    onError: (error, input) => {
      setRoleDrafts((drafts) => {
        const next = { ...drafts };
        delete next[input.memberId];
        return next;
      });
      setActionError(getErrorMessage(error));
    },
  });

  const removeMember = useMutation({
    mutationFn: (memberId: number) => api.members.remove(memberId),
    onSuccess: async () => {
      await invalidateBoard();
      setActionError(null);
    },
  });

  const handleInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = identifier.trim().replace(/^@/, "");

    if (!value) {
      setInviteError("Escribe un email o nombre de usuario.");
      return;
    }

    const input: AddMemberInput = {
      boardId,
      role: isOwner ? inviteRole : "member",
    };

    if (value.includes("@")) {
      input.email = value.toLowerCase();
    } else {
      input.username = value.toLowerCase();
    }

    addMember.mutate(input);
  };

  const handleRoleChange = (member: BoardMember, role: MemberRole) => {
    setRoleDrafts((drafts) => ({ ...drafts, [member.id]: role }));
    updateRole.mutate({ memberId: member.id, role });
  };

  return (
    <>
      <Modal
        title="Miembros"
        subtitle="Invita a personas que ya tengan una cuenta y gestiona su acceso al tablero."
        width={600}
        onClose={onClose}
      >
        <div className="members">
          {actionError ? (
            <p className="form-error" role="alert">
              {actionError}
            </p>
          ) : null}

          <ul className="members__list">
            <li className="member-row">
              <Avatar
                name={displayName(owner, 0)}
                id={owner?.id}
                size={38}
              />
              <div className="member-row__identity">
                <span className="member-row__name">
                  {owner ? displayName(owner, 0) : "Propietario del tablero"}
                  {owner?.id === currentUserId ? (
                    <span className="member-row__you">Tú</span>
                  ) : null}
                </span>
                <span className="member-row__detail">
                  {owner ? userDetails(owner) : "Acceso completo"}
                </span>
              </div>
              <span className="badge badge--owner">Propietario</span>
            </li>

            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const role = roleDrafts[member.id] ?? member.role;
              const isUpdating =
                updateRole.isPending &&
                updateRole.variables?.memberId === member.id;

              return (
                <li key={member.id} className="member-row">
                  <Avatar
                    name={displayName(member.user, member.userId)}
                    id={member.userId}
                    size={38}
                  />
                  <div className="member-row__identity">
                    <span className="member-row__name">
                      {displayName(member.user, member.userId)}
                      {isSelf ? (
                        <span className="member-row__you">Tú</span>
                      ) : null}
                    </span>
                    <span className="member-row__detail">
                      {userDetails(member.user)}
                    </span>
                  </div>

                  {isOwner ? (
                    <label className="member-row__role">
                      <span className="sr-only">
                        Rol de {displayName(member.user, member.userId)}
                      </span>
                      <select
                        className="member-role-select"
                        value={role}
                        disabled={isUpdating}
                        onChange={(event) =>
                          handleRoleChange(
                            member,
                            event.target.value as MemberRole,
                          )
                        }
                      >
                        <option value="member">{ROLE_LABELS.member}</option>
                        <option value="admin">{ROLE_LABELS.admin}</option>
                      </select>
                    </label>
                  ) : (
                    <span className="badge">{ROLE_LABELS[member.role]}</span>
                  )}

                  {canManage && !isSelf ? (
                    <button
                      type="button"
                      className="icon-button icon-button--small button--danger-text"
                      aria-label={`Quitar a ${displayName(member.user, member.userId)}`}
                      title="Quitar del tablero"
                      onClick={() => setRemovingMember(member)}
                    >
                      <TrashIcon size={16} />
                    </button>
                  ) : (
                    <span className="member-row__spacer" />
                  )}
                </li>
              );
            })}
          </ul>

          {members.length === 0 ? (
            <p className="members__empty">
              Todavía no hay otros miembros. Invita a alguien para colaborar.
            </p>
          ) : null}

          {canManage ? (
            <form className="invite-form" onSubmit={handleInvite}>
              <div className="invite-form__title">
                <UsersIcon size={17} />
                <span>Invitar a una cuenta existente</span>
              </div>

              <div className="invite-form__row">
                <label className="field invite-form__field">
                  <span>Email o nombre de usuario</span>
                  <input
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      setInviteError(null);
                      setSuccess(null);
                    }}
                    placeholder="persona@ejemplo.com o usuario"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={addMember.isPending}
                  />
                </label>

                {isOwner ? (
                  <label className="field invite-form__role">
                    <span>Rol</span>
                    <select
                      value={inviteRole}
                      onChange={(event) =>
                        setInviteRole(event.target.value as MemberRole)
                      }
                      disabled={addMember.isPending}
                    >
                      <option value="member">Miembro</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </label>
                ) : null}

                <button
                  type="submit"
                  className="button button--primary"
                  disabled={addMember.isPending || identifier.trim() === ""}
                >
                  {addMember.isPending ? "Invitando..." : "Invitar"}
                </button>
              </div>

              {inviteError ? (
                <p className="form-error" role="alert">
                  {inviteError}
                </p>
              ) : null}

              {success ? (
                <p className="form-success" role="status">
                  {success}
                </p>
              ) : null}
            </form>
          ) : (
            <p className="members__hint">
              Solo el propietario y los administradores pueden invitar o quitar
              miembros.
            </p>
          )}
        </div>
      </Modal>

      {removingMember ? (
        <ConfirmDialog
          title="Quitar miembro"
          message={`${displayName(removingMember.user, removingMember.userId)} perderá acceso al tablero.`}
          confirmLabel="Quitar"
          onConfirm={async () => {
            await removeMember.mutateAsync(removingMember.id);
          }}
          onClose={() => setRemovingMember(null)}
        />
      ) : null}
    </>
  );
}
