import { create } from "zustand";

import {
  api,
  setAccessToken,
  setUnauthorizedHandler,
} from "../lib/api";
import { queryClient } from "../lib/queryClient";
import type { AuthUser, RegisterInput } from "../lib/types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

let bootstrapStarted = false;

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "loading",
  user: null,

  async bootstrap() {
    if (bootstrapStarted) {
      return;
    }

    bootstrapStarted = true;

    const data = await api.auth.refresh();

    if (data) {
      setAccessToken(data.accessToken);
      set({ status: "authenticated", user: data.user });
      return;
    }

    set({ status: "anonymous", user: null });
  },

  async login(email, password) {
    const data = await api.auth.login(email.trim().toLowerCase(), password);

    setAccessToken(data.accessToken);
    set({ status: "authenticated", user: data.user });
  },

  async register(input) {
    await api.auth.register(input);
    await get().login(input.email, input.password);
  },

  async logout() {
    try {
      await api.auth.logout();
    } catch {
      // El logout local debe funcionar aunque la API falle.
    }

    setAccessToken(null);
    set({ status: "anonymous", user: null });
    queryClient.clear();
  },
}));

setUnauthorizedHandler(() => {
  useAuthStore.setState({ status: "anonymous", user: null });
  queryClient.clear();
});
