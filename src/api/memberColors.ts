// The colors a Member can pick for their profile circle, shown behind their
// initials. Kept in step with src/Models/MemberColors.cpp (the server
// rejects anything else) and database migration 0022.
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

// Up to two initials, e.g. "Grace Adeyemi" -> "GA", "Manu" -> "M".
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}
