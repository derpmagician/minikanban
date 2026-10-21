import { Link, useNavigate } from "react-router";

import { useAuthStore } from "../store/auth";
import { Avatar } from "./Avatar";
import { LogoMark, LogOutIcon } from "./Icons";

export function AppHeader() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const displayName = user?.name ?? user?.username ?? user?.email ?? "Usuario";

  return (
    <header className="app-header">
      <Link to="/" className="brand" aria-label="MiniKanban, ir a tableros">
        <span className="brand__mark">
          <LogoMark size={26} />
        </span>
        <span className="brand__name">MiniKanban</span>
      </Link>

      <div className="app-header__user">
        <div className="user-chip">
          <Avatar name={displayName} id={user?.id} size={32} />
          <div className="user-chip__text">
            <strong>{displayName}</strong>
            <span>{user?.email}</span>
          </div>
        </div>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={handleLogout}
        >
          <LogOutIcon size={16} />
          Salir
        </button>
      </div>
    </header>
  );
}
