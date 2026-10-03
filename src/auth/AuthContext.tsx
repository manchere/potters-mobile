import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import * as authStorage from "../api/authStorage";
import { api, ApiError, setUnauthorizedHandler } from "../api/client";
import type { Access, User } from "../api/types";
import { defaultAccess } from "./access";

type AuthState = {
  // "loading" only while the saved sign-in is read at launch.
  status: "loading" | "signedOut" | "signedIn";
  user: User | null;
  // What the signed-in member may do (Settings > Access Rights on the
  // desktop): which screens and buttons the app shows.
  access: Access;
  // No one has ever signed in on this phone: open on Create Profile.
  firstLaunch: boolean;
  // Why the member was signed out, shown once on the sign-in screen.
  notice: string | null;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: (notice?: string) => Promise<void>;
  updateUser: (user: User) => void;
  // Re-reads access rights -- an Admin may have changed them, or they
  // follow the duties on the coming Sunday.
  refreshAccess: () => Promise<void>;
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
  const [access, setAccess] = useState<Access>(defaultAccess(false));
  const [firstLaunch, setFirstLaunch] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshAccess = useCallback(async () => {
    try {
      const fresh = await api.access.mine();
      setAccess(fresh);
      await authStorage.setAccess(fresh);
    } catch {
      // Offline or server asleep: keep what we have.
    }
  }, []);

  const signOut = useCallback(async (reason?: string) => {
    await authStorage.clearSession();
    setUser(null);
    setAccess(defaultAccess(false));
    setNotice(reason ?? null);
    setStatus("signedOut");
  }, []);

  const signIn = useCallback(async (token: string, signedIn: User) => {
    await authStorage.setSession(token, signedIn);
    setUser(signedIn);
    setAccess(defaultAccess(signedIn.is_admin));
    setNotice(null);
    setFirstLaunch(false);
    setStatus("signedIn");
    refreshAccess();
  }, [refreshAccess]);

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
      const [token, cached, cachedAccess, lastPhone] = await Promise.all([
        authStorage.getToken(),
        authStorage.getUser(),
        authStorage.getAccess(),
        authStorage.getLastPhone(),
      ]);
      if (!token) {
        setFirstLaunch(!lastPhone);
        setStatus("signedOut");
        return;
      }
      setUser(cached);
      setAccess(cachedAccess ?? defaultAccess(cached?.is_admin ?? false));
      setStatus("signedIn");
      refreshAccess();
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
  }, [updateUser, refreshAccess]);

  const value = useMemo(
    () => ({ status, user, access, firstLaunch, notice, signIn, signOut, updateUser, refreshAccess }),
    [status, user, access, firstLaunch, notice, signIn, signOut, updateUser, refreshAccess],
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
