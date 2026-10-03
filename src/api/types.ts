// Mirrors the wire format produced by Server/Json.cpp - field names match
// the Postgres columns so objects round-trip straight back into a PUT/POST.

export type ItemStatus = "available" | "missing" | "broken" | "lost";

export interface Item {
  id: number;
  name: string;
  description: string;
  quantity: number;
  location: string;
  barcode: string | null;
  status: ItemStatus;
  category_id: number | null;
  tag_ids: number[];
  image_url: string | null;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface VisionSuggestion {
  name?: string;
  description?: string;
  [key: string]: unknown;
}

export interface User {
  id: number;
  name: string;
  phone: string;
  is_admin: boolean;
  color: string;
}

export interface AuthResponse extends User {
  token: string;
}

export type NonAvailabilityStatus = "pending" | "approved" | "denied";

export interface NonAvailabilityRequest {
  id: number;
  duty_id: number;
  user_id: number;
  message: string;
  status: NonAvailabilityStatus;
  decided_by: number | null;
  decided_at: string | null;
  // Only on GET /api/non-availability-requests/me: the duty it's about.
  duty_type_name?: string;
  duty_type_icon?: string;
  service_date?: string; // "YYYY-MM-DD"
}

export interface Duty {
  id: number;
  // duty_type_id points at an admin-manageable duty type (no longer a fixed
  // enum -- see src/Models/DutyType.h); duty_type_name/duty_type_icon
  // are denormalized onto the duty by the server so the client
  // never needs a separate lookup.
  duty_type_id: number;
  duty_type_name: string;
  duty_type_icon: string;
  service_date: string; // "YYYY-MM-DD"
  member_id: number | null;
  support_member_id: number | null;
  notes: string;
  // Only present on GET /api/duties/me.
  conflicts_with_calendar?: boolean;
  // Who serves and who backs up (FR-7.4), and which of the two "me" is.
  member_name?: string | null;
  member_color?: string | null;
  support_member_name?: string | null;
  support_member_color?: string | null;
  role?: "serving" | "backup";
  non_availability_request?: NonAvailabilityRequest | null;
}

export interface AvailabilityMark {
  id: number;
  user_id: number;
  date: string; // "YYYY-MM-DD"
}

// GET /api/schedule/<date>: one Sunday's line-up. editable is false once
// the Sunday has passed (nobody can change it then).
export interface ScheduleDay {
  date: string; // "YYYY-MM-DD"
  editable: boolean;
  duties: Duty[];
}

export interface DutyType {
  id: number;
  name: string;
  icon: string;
}

// GET /api/members: just enough to pick someone and show their badge.
export interface Member {
  id: number;
  name: string;
  color: string;
}

// The body for adding or changing a duty (Admins only). Changing keeps the
// duty and its Sunday; only who serves, the backup and the notes change.
export interface DutyInput {
  duty_type_id: number;
  service_date: string;
  member_id: number | null;
  support_member_id: number | null;
  notes: string;
}

// One duty in a schedule report (desktop Reports tab).
export interface ReportRow {
  duty_id: number;
  service_date: string;
  duty_type_name: string;
  duty_type_icon: string;
  member_id: number | null;
  member_name: string | null;
  support_member_id: number | null;
  support_member_name: string | null;
  notes: string;
  // Only the status of a time-off request -- never the reason.
  request_status: NonAvailabilityStatus | null;
  member_marked_unavailable: boolean;
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  song_key: string;
  link: string;
  lyrics: string;
}

export type FeedbackKind = "bug" | "feature" | "profile";

export interface Feedback {
  id: number;
  kind: FeedbackKind;
  member_id: number | null;
  member_name?: string | null;
  subject: string;
  details: string;
  done: boolean;
  created_at: string | null;
}

// What the member may do in one section, as set by an Admin in the desktop
// app's Settings > Access Rights.
export interface SectionAccess {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export type SectionKey = "reports" | "songs" | "inventory" | "taxonomy" | "feedback" | "settings";

export interface Access {
  is_admin: boolean;
  // The schedule has no access rule of its own: only Admins change it.
  can_manage_schedule: boolean;
  sections: Record<SectionKey, SectionAccess>;
}
