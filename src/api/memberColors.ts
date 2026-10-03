// A Member's profile circle color, shown behind their initials. Any
// "#rrggbb" is allowed (the server checks just that, see
// src/Models/MemberColors.cpp); MEMBER_COLORS are the quick picks offered
// first, kept in step with that file's palette.
export const MEMBER_COLORS: { name: string; hex: string }[] = [
  { name: "Navy", hex: "#1f4a85" },
  { name: "Teal", hex: "#0f766e" },
  { name: "Green", hex: "#2f855a" },
  { name: "Gold", hex: "#b7791f" },
  { name: "Orange", hex: "#c05621" },
  { name: "Red", hex: "#c53030" },
  { name: "Pink", hex: "#b83280" },
  { name: "Purple", hex: "#6b46c1" },
  { name: "Indigo", hex: "#4c51bf" },
  { name: "Slate", hex: "#4a5568" },
];

export const DEFAULT_MEMBER_COLOR = MEMBER_COLORS[0].hex;

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

// White, or a near-black on light colors, so initials stay readable on
// whatever color was picked. Same rule as MemberColors::textColor.
export function textColorFor(hex: string): string {
  if (!isHexColor(hex)) return "#fff";
  const channel = (index: number) => Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  const luminance = (0.299 * channel(0) + 0.587 * channel(1) + 0.114 * channel(2)) / 255;
  return luminance > 0.6 ? "#1a202c" : "#fff";
}

// hue 0-360, saturation and lightness 0-1 -> "#rrggbb".
export function hslToHex(hue: number, saturation: number, lightness: number): string {
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value = lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

// hue 0-360, saturation and value 0-1 -> "#rrggbb" (the color picker's
// square is saturation across, value/brightness down).
export function hsvToHex(hue: number, saturation: number, value: number): string {
  const channel = (n: number) => {
    const k = (n + hue / 60) % 6;
    const level = value - value * saturation * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(level * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(5)}${channel(3)}${channel(1)}`;
}

// "#rrggbb" -> hue 0-360, saturation and value 0-1.
export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  if (!isHexColor(hex)) return { h: 0, s: 0, v: 0 };
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let h = 0;
  if (delta > 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  return { h: (h + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

// Up to two initials, e.g. "Grace Adeyemi" -> "GA", "Manu" -> "M".
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}
