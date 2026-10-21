import { useState } from "react";
import { Link, Navigate } from "react-router";
import type { FormEvent } from "react";

import { LogoMark } from "../components/Icons";
import { getErrorMessage } from "../lib/api";
import { useAuthStore } from "../store/auth";

type AuthPageProps = {
  mode: "login" | "register";
};

const DEMO_EMAIL = "demo@minikanban.dev";
const DEMO_PASSWORD = "Demo1234";

export function AuthPage({ mode }: AuthPageProps) {
  const status = useAuthStore((state) => state.status);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  const isLogin = mode === "login";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register({
          email,
          username,
          password,
          ...(name.trim() ? { name: name.trim() } : {}),
        });
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link to="/login" className="auth-brand">
          <span className="auth-brand__mark">
            <LogoMark size={30} />
          </span>
          <span>MiniKanban</span>
        </Link>

        <div className="auth-visual__copy">
          <p className="eyebrow">Organiza el trabajo, no el caos</p>
          <h1>Todo tu equipo, en la misma página.</h1>
          <p>
            Tableros simples, tarjetas claras y la satisfacción de mover algo a
            “Terminado”.
          </p>
        </div>

        <div className="preview-board" aria-hidden="true">
          <div className="preview-column">
            <span className="preview-column__title">Backlog</span>
            <div className="preview-card">
              <span className="preview-dot preview-dot--low" />
              Definir la paleta
            </div>
            <div className="preview-card">
              <span className="preview-dot preview-dot--medium" />
              Diseñar el tablero
            </div>
          </div>
          <div className="preview-column">
            <span className="preview-column__title">En progreso</span>
            <div className="preview-card preview-card--active">
              <span className="preview-dot preview-dot--high" />
              Conectar la API
            </div>
          </div>
          <div className="preview-column">
            <span className="preview-column__title">Terminado</span>
            <div className="preview-card preview-card--done">
              <span className="preview-dot preview-dot--done" />
              Crear el proyecto
            </div>
          </div>
        </div>

        <p className="auth-visual__footer">
          Hecho para equipos pequeños con ideas grandes.
        </p>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrapper">
          <p className="eyebrow">{isLogin ? "Bienvenido de vuelta" : "Empieza gratis"}</p>
          <h2>{isLogin ? "Inicia sesión" : "Crea tu cuenta"}</h2>
          <p className="auth-subtitle">
            {isLogin
              ? "Entra para ver tus tableros y seguir moviendo cards."
              : "Un par de datos y tendrás tu primer tablero listo."}
          </p>

          <form className="form" onSubmit={handleSubmit}>
            {!isLogin ? (
              <div className="form-row">
                <label className="field">
                  <span>Usuario</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="tu_usuario"
                    autoComplete="username"
                    minLength={3}
                    maxLength={30}
                    required
                  />
                </label>

                <label className="field">
                  <span>Nombre (opcional)</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="name"
                    maxLength={100}
                  />
                </label>
              </div>
            ) : null}

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span>Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isLogin ? "Tu contraseña" : "Mínimo 8 caracteres"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={isLogin ? 1 : 8}
                maxLength={128}
                required
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="button button--primary button--wide" disabled={busy}>
              {busy
                ? "Un momento..."
                : isLogin
                  ? "Entrar"
                  : "Crear cuenta y entrar"}
            </button>
          </form>

          {isLogin ? (
            <button type="button" className="demo-login" onClick={fillDemo}>
              Probar con la cuenta demo
              <span>demo@minikanban.dev · Demo1234</span>
            </button>
          ) : null}

          <p className="auth-switch">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <Link to={isLogin ? "/register" : "/login"}>
              {isLogin ? "Regístrate" : "Inicia sesión"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
