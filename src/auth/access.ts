import type { Access, SectionAccess, SectionKey } from "../api/types";

const SECTIONS: SectionKey[] = ["reports", "songs", "inventory", "taxonomy", "feedback", "settings"];

function everySection(make: (section: SectionKey) => SectionAccess): Access["sections"] {
  return Object.fromEntries(SECTIONS.map((section) => [section, make(section)])) as Access["sections"];
}

// What the app assumes until GET /api/access/me answers for the first time:
// Admins can do everything; anyone else gets the server's own defaults
// (open every section, send feedback, change nothing). The server checks
// every change anyway, so a wrong guess only shows a button that fails.
export function defaultAccess(isAdmin: boolean): Access {
  return {
    is_admin: isAdmin,
    can_manage_schedule: isAdmin,
    sections: everySection((section) =>
      isAdmin
        ? { view: true, create: true, update: true, delete: true }
        : { view: true, create: section === "feedback", update: false, delete: false },
    ),
  };
}
