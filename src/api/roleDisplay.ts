import type { AssignmentRole } from "./types";

// Mirrors PottersInventory/Views/RoleDisplay.cpp on the desktop app - keep
// the two in sync if a role is ever added/renamed.
const ICONS: Record<AssignmentRole, string> = {
  singing: "🎤",
  translating: "🌐",
  preaching: "📖",
  offering: "💰",
  announcement: "📢",
};

const LABELS: Record<AssignmentRole, string> = {
  singing: "Singing",
  translating: "Translating",
  preaching: "Preaching",
  offering: "Offering",
  announcement: "Announcement",
};

export function roleIcon(role: AssignmentRole): string {
  return ICONS[role];
}

export function roleLabel(role: AssignmentRole): string {
  return LABELS[role];
}
