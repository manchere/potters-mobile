import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "../config";
import * as authStorage from "./authStorage";
import type {
  Access,
  Duty,
  DutyInput,
  DutyType,
  AuthResponse,
  AvailabilityMark,
  Category,
  Feedback,
  FeedbackKind,
  Item,
  Member,
  NonAvailabilityRequest,
  ReportRow,
  ScheduleDay,
  Song,
  Tag,
  User,
  VisionSuggestion,
} from "./types";

// Called when the server says the saved sign-in is no longer valid (401 on
// a request that sent a token), so the app can return to the sign-in
// screen instead of showing errors everywhere. Set by AuthContext.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// A failed request; status is the HTTP status (0 when the server couldn't
// be reached at all).
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await authStorage.getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal: controller.signal });
  } catch {
    // Network-level failure (wrong address, server down, firewall, phone
    // on a different network) - name the URL so it's obvious what to fix.
    throw new ApiError("Can't reach Potters Portal right now. Check your internet connection and try again.", 0);
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && token) {
      onUnauthorized?.();
    }
    throw new ApiError(body.error ?? `${response.status} ${response.statusText}`, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  items: {
    list: () => request<Item[]>("/api/items"),
    get: (id: number) => request<Item>(`/api/items/${id}`),
    getByBarcode: (barcode: string) =>
      request<Item>(`/api/items/barcode/${encodeURIComponent(barcode)}`),
    create: (item: Partial<Item>) =>
      request<Item>("/api/items", { method: "POST", body: JSON.stringify(item) }),
    update: (id: number, item: Partial<Item>) =>
      request<Item>(`/api/items/${id}`, { method: "PUT", body: JSON.stringify(item) }),
    remove: (id: number) => request<{ ok: boolean }>(`/api/items/${id}`, { method: "DELETE" }),
    setImage: (id: number, imageBase64: string) =>
      request<Item>(`/api/items/${id}/image`, {
        method: "POST",
        body: JSON.stringify({ image_base64: imageBase64 }),
      }),
    imageUrl: (id: number) => `${API_BASE_URL}/api/items/${id}/image`,
    setStatus: (id: number, status: Item["status"]) =>
      request<Item>(`/api/items/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },
  tags: {
    list: () => request<Tag[]>("/api/tags"),
  },
  categories: {
    list: () => request<Category[]>("/api/categories"),
  },
  vision: {
    describeItem: (imageBase64: string) =>
      request<VisionSuggestion>("/api/vision/describe-item", {
        method: "POST",
        body: JSON.stringify({ image_base64: imageBase64 }),
      }),
  },
  auth: {
    register: (name: string, email: string, password: string, color: string) =>
      request<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, color }),
      }),
    login: (email: string, password: string) =>
      request<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
    // Confirms the saved token and returns the member's current profile.
    me: () => request<User>("/api/auth/me"),
  },
  duties: {
    // Upcoming duties for the logged-in Member (as primary or
    // support), each flagged with conflicts_with_calendar per FR-4.2.
    listMine: () => request<Duty[]>("/api/duties/me"),
    // Admins only (the server refuses anyone else, and any past Sunday).
    create: (duty: DutyInput) => request<Duty>("/api/duties", { method: "POST", body: JSON.stringify(duty) }),
    update: (id: number, duty: DutyInput) =>
      request<Duty>(`/api/duties/${id}`, { method: "PUT", body: JSON.stringify(duty) }),
    remove: (id: number) => request<{ ok: boolean }>(`/api/duties/${id}`, { method: "DELETE" }),
  },
  schedule: {
    // Everyone serving on one Sunday ("YYYY-MM-DD").
    forDate: (date: string) => request<ScheduleDay>(`/api/schedule/${date}`),
  },
  dutyTypes: {
    list: () => request<DutyType[]>("/api/duty-types"),
  },
  members: {
    list: () => request<Member[]>("/api/members"),
  },
  access: {
    mine: () => request<Access>("/api/access/me"),
  },
  reports: {
    // Newest Sunday first.
    schedule: (from: string, to: string) => request<ReportRow[]>(`/api/reports/schedule?from=${from}&to=${to}`),
  },
  songs: {
    list: () => request<Song[]>("/api/songs"),
    create: (song: Omit<Song, "id">) => request<Song>("/api/songs", { method: "POST", body: JSON.stringify(song) }),
    update: (id: number, song: Omit<Song, "id">) =>
      request<Song>(`/api/songs/${id}`, { method: "PUT", body: JSON.stringify(song) }),
    remove: (id: number) => request<{ ok: boolean }>(`/api/songs/${id}`, { method: "DELETE" }),
  },
  feedback: {
    send: (kind: FeedbackKind, subject: string, details: string) =>
      request<Feedback>("/api/feedback", { method: "POST", body: JSON.stringify({ kind, subject, details }) }),
    // Everyone's requests -- needs Feedback "update" or "delete".
    list: () => request<Feedback[]>("/api/feedback"),
    setDone: (id: number, done: boolean) =>
      request<{ ok: boolean }>(`/api/feedback/${id}`, { method: "PATCH", body: JSON.stringify({ done }) }),
    remove: (id: number) => request<{ ok: boolean }>(`/api/feedback/${id}`, { method: "DELETE" }),
  },
  availability: {
    list: () => request<AvailabilityMark[]>("/api/availability"),
    mark: (date: string) =>
      request<{ ok: boolean }>("/api/availability", { method: "POST", body: JSON.stringify({ date }) }),
    unmark: (date: string) => request<{ ok: boolean }>(`/api/availability/${date}`, { method: "DELETE" }),
  },
  nonAvailabilityRequests: {
    listMine: () => request<NonAvailabilityRequest[]>("/api/non-availability-requests/me"),
    create: (dutyId: number, message: string) =>
      request<NonAvailabilityRequest>(`/api/duties/${dutyId}/non-availability-requests`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
  },
};
