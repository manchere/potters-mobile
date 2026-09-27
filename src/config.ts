import Constants from "expo-constants";
import { Platform } from "react-native";

// PottersInventoryServer listens on this port by default (see
// Server/ServerMain.cpp). Override with EXPO_PUBLIC_API_PORT if it runs
// elsewhere.
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || "8080";

// Matches a bare IPv4 address or a *.local mDNS name - the forms Metro's
// hostUri takes on a LAN. A tunnel hostname (*.exp.direct) is neither, and
// the tunnel only forwards Metro, not the API server.
const LAN_HOST = /^(\d{1,3}\.){3}\d{1,3}$|\.local$/;

// When the app runs in Expo Go, hostUri is "<dev machine LAN IP>:<metro
// port>" - the same machine PottersInventoryServer runs on during
// development, and an address the phone can already reach (it just
// downloaded the JS bundle from it).
function devMachineHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    return null;
  }
  const host = hostUri.split(":")[0];
  return LAN_HOST.test(host) ? host : null;
}

// Resolution order:
//   1. EXPO_PUBLIC_API_URL (set in .env) - e.g. a cloudflared tunnel URL,
//      required when using `expo start --tunnel` or a deployed server.
//   2. The dev machine's LAN IP from Metro - makes Expo Go on a physical
//      phone on the same Wi-Fi work with no configuration.
//   3. Emulator/simulator fallbacks: 10.0.2.2 is the Android emulator's
//      alias for the host machine; the iOS simulator shares its network.
function defaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  const lanHost = devMachineHost();
  if (lanHost) {
    return `http://${lanHost}:${API_PORT}`;
  }
  const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  return `http://${host}:${API_PORT}`;
}

export const API_BASE_URL = defaultApiUrl();

// A phone that can't reach the server otherwise sits on fetch() for the OS
// default (often over a minute) before failing.
export const REQUEST_TIMEOUT_MS = 15000;
