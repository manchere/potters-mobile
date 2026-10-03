import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import * as authStorage from "../api/authStorage";
import { api, ApiError, setUnauthorizedHandler } from "../api/client";
import type { User } from "../api/types";

type AuthState = {
  // "loading" only while the saved sign-in is read at launch.
  status: "loading" | "signedOut" | "signedIn";
  user: User | null;
  // Why the member was signed out, shown once on the sign-in screen.
  notice: string | null;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: (notice?: string) => Promise<void>;
  updateUser: (user: User) => void;
};

const AuthContext = createContext<AuthState | null>(null);

// Keeps the member signed in across launches: a saved token opens the app
// straight on Home with the cached profile, then GET /api/auth/me confirms
// it in the background (the server also extends the session on every use).
// Only a definite "no longer valid" (401) signs them out -- being offline or
// the server waking up does not.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signOut = useCallback(async (reason?: string) => {
    await authStorage.clearSession();
    setUser(null);
    setNotice(reason ?? null);
    setStatus("signedOut");
  }, []);

  const signIn = useCallback(async (token: string, signedIn: User) => {
    await authStorage.setSession(token, signedIn);
    setUser(signedIn);
    setNotice(null);
    setStatus("signedIn");
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
    authStorage.setUser(updated);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut("Your sign-in has expired. Please sign in again.");
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  useEffect(() => {
    (async () => {
      const [token, cached] = await Promise.all([authStorage.getToken(), authStorage.getUser()]);
      if (!token) {
        setStatus("signedOut");
        return;
      }
      setUser(cached);
      setStatus("signedIn");
      try {
        updateUser(await api.auth.me());
      } catch (err) {
        // 401 is handled by the unauthorized handler; anything else
        // (offline, server asleep) keeps the saved sign-in.
        if (!(err instanceof ApiError) || err.status !== 401) {
          return;
        }
      }
    })();
  }, [updateUser]);

  const value = useMemo(
    () => ({ status, user, notice, signIn, signOut, updateUser }),
    [status, user, notice, signIn, signOut, updateUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
