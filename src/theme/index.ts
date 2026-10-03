import { useColorScheme } from "react-native";

// The desktop app's color sets (src/Style.cpp), so both apps look like one
// product: the phone's light mode uses the desktop "Light" theme (white
// surfaces, navy buttons, gold accents) and its dark mode uses "Navy & Gold"
// (the app icon's colors: navy surfaces, gold buttons).
export type Palette = {
  dark: boolean;
  text: string;
  strongText: string;
  softText: string;
  mutedText: string;
  faintText: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  input: string;
  border: string;
  inputBorder: string;
  divider: string;
  subtle: string;
  primary: string;
  primaryPressed: string;
  primaryText: string;
  primaryDisabled: string;
  accentBg: string;
  accentText: string;
  error: string;
  errorBg: string;
  success: string;
  successBg: string;
  tabBar: string;
  tabActive: string;
  tabInactive: string;
};

export const lightPalette: Palette = {
  dark: false,
  text: "#262b3d",
  strongText: "#1f2430",
  softText: "#384057",
  mutedText: "#6b7280",
  faintText: "#8a90a0",
  background: "#f7f8fb",
  surface: "#ffffff",
  surfaceAlt: "#fafbfd",
  input: "#ffffff",
  border: "#e7e9f0",
  inputBorder: "#dde1ea",
  divider: "#ebedf3",
  subtle: "#eef0f4",
  primary: "#14335c",
  primaryPressed: "#0a1d36",
  primaryText: "#ffffff",
  primaryDisabled: "#9aa8bd",
  accentBg: "#faf3e0",
  accentText: "#8a6a1a",
  error: "#dc2626",
  errorBg: "#fdecec",
  success: "#1e7b3a",
  successBg: "#e3f4e8",
  tabBar: "#ffffff",
  tabActive: "#14335c",
  tabInactive: "#8a90a0",
};

export const navyPalette: Palette = {
  dark: true,
  text: "#e8ecf4",
  strongText: "#ffffff",
  softText: "#cdd5e3",
  mutedText: "#9aa7bf",
  faintText: "#7886a0",
  background: "#0b1a33",
  surface: "#10244a",
  surfaceAlt: "#132a54",
  input: "#0e2142",
  border: "#1f3a66",
  inputBorder: "#2a4777",
  divider: "#1a3360",
  subtle: "#162d57",
  primary: "#d4a72c",
  primaryPressed: "#b88f1f",
  primaryText: "#0b1a33",
  primaryDisabled: "#3a4a66",
  accentBg: "#2e2f2a",
  accentText: "#f0c75e",
  error: "#f87171",
  errorBg: "#3a1c24",
  success: "#6fcf8a",
  successBg: "#12301c",
  tabBar: "#10244a",
  tabActive: "#f0c75e",
  tabInactive: "#7886a0",
};

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? navyPalette : lightPalette;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 6, md: 10, lg: 14, pill: 999 };

// Inventory status colors, as on the desktop's status badges (Badge.cpp).
export const statusColors: Record<string, string> = {
  available: "#1f8a4c",
  missing: "#b48a00",
  broken: "#c0392b",
  lost: "#6b7280",
};

// Request status colors: pending (gold), approved (green), denied (red).
export const requestColors: Record<string, string> = {
  pending: "#b7791f",
  approved: "#1f8a4c",
  denied: "#c0392b",
};
