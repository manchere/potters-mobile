const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "YYYY-MM-DD" from the server, read as a local date (not UTC midnight,
// which would show the day before in some time zones).
export function parseDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Day first, like the desktop app: "Sun 4 Oct 2026".
export function formatDate(iso: string): string {
  const date = parseDate(iso);
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// "Sun 4 Oct" -- for lists where the year is obvious.
export function formatShortDate(iso: string): string {
  const date = parseDate(iso);
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

// "Today", "This Sunday", "Next Sunday", "In 3 weeks", "In 2 months".
export function relativeSunday(iso: string, today = new Date()): string {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((parseDate(iso).getTime() - start.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days < 7) return "This Sunday";
  if (days < 14) return "Next Sunday";
  if (days < 56) return `In ${Math.floor(days / 7)} weeks`;
  return `In ${Math.round(days / 30)} months`;
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

