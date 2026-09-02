import { Platform } from "react-native";

// PottersInventoryServer listens on this port by default (see
// Server/ServerMain.cpp). Android emulators can't reach the host machine via
// "localhost" - 10.0.2.2 is the emulator's alias for it. A physical device
// needs your machine's LAN IP instead; override with EXPO_PUBLIC_API_URL.
function defaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  return `http://${host}:8080`;
}

export const API_BASE_URL = defaultApiUrl();
