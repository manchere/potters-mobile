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
  email: string;
  is_admin: boolean;
  avatar_seed: string;
}

export interface AuthResponse extends User {
  token: string;
}

export type NonAvailabilityStatus = "pending" | "approved" | "denied";

export interface NonAvailabilityRequest {
  id: number;
  assignment_id: number;
  user_id: number;
  message: string;
  status: NonAvailabilityStatus;
  decided_by: number | null;
  decided_at: string | null;
}

export type AssignmentRole = "singing" | "translating" | "preaching" | "offering" | "announcement";

export interface Assignment {
  id: number;
  role: AssignmentRole;
  service_date: string; // "YYYY-MM-DD"
  member_id: number | null;
  support_member_id: number | null;
  notes: string;
  // Only present on GET /api/assignments/me.
  conflicts_with_calendar?: boolean;
  non_availability_request?: NonAvailabilityRequest | null;
}

export interface AvailabilityMark {
  id: number;
  user_id: number;
  date: string; // "YYYY-MM-DD"
}
