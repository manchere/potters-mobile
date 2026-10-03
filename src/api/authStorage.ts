import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { Access, User } from "./types";

// The session token and the signed-in member, kept on the device so the app
// opens straight to Home on later launches (FR4). There's no
// GET /api/users/me for the cached profile -- GET /api/auth/me confirms the
// token and refreshes it in the background (see auth/AuthContext.tsx).
//
// Phones keep these in the OS keychain/keystore (expo-secure-store); the
// web build, which has no secure store, uses the browser's localStorage.
const TOKEN_KEY = "potters_portal_auth_token";
const USER_KEY = "potters_portal_auth_user";
// What the member may do, so the right screens and buttons show at launch
// even before the server answers (or when it can't be reached).
const ACCESS_KEY = "potters_portal_access";
// Pre-fills the sign-in form after signing out; also tells a first launch
// (never signed in on this phone) from a later one.
const LAST_EMAIL_KEY = "potters_portal_last_email";

const isWeb = Platform.OS === "web";

async function read(key: string): Promise<string | null> {
  try {
    return isWeb ? globalThis.localStorage?.getItem(key) ?? null : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function remove(key: string): Promise<void> {
  try {
    if (isWeb) {
      globalThis.localStorage?.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // Already gone.
  }
}

export function getToken(): Promise<string | null> {
  return read(TOKEN_KEY);
}

export async function getUser(): Promise<User | null> {
  const raw = await read(USER_KEY);
  try {
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export async function setSession(token: string, user: User): Promise<void> {
  await write(TOKEN_KEY, token);
  await setUser(user);
  await write(LAST_EMAIL_KEY, user.email);
}

export async function setUser(user: User): Promise<void> {
  // Only the profile fields -- never the token -- go in the user record.
  const { id, name, email, is_admin, color } = user;
  await write(USER_KEY, JSON.stringify({ id, name, email, is_admin, color }));
}

export async function clearSession(): Promise<void> {
  await remove(TOKEN_KEY);
  await remove(USER_KEY);
  await remove(ACCESS_KEY);
}

export async function getAccess(): Promise<Access | null> {
  const raw = await read(ACCESS_KEY);
  try {
    return raw ? (JSON.parse(raw) as Access) : null;
  } catch {
    return null;
  }
}

export async function setAccess(access: Access): Promise<void> {
  await write(ACCESS_KEY, JSON.stringify(access));
}

export function getLastEmail(): Promise<string | null> {
  return read(LAST_EMAIL_KEY);
}
