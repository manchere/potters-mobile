# Mobile App — Functional Requirements

Scope: the React Native mobile client in `mobile/`, consuming the existing
`PottersPortalServer` REST API. No new backend capability is assumed
beyond what's listed under "Backend dependencies" per requirement.

## FR1 — Store an item by taking a photo

A member can add a new inventory item starting from a camera photo instead
of a blank form.

**Flow**
1. Member taps **+ Add Item** and takes a photo of the item.
2. The app sends the photo to the vision endpoint, which returns a
   suggested name and description.
3. The suggestion pre-fills an editable form (name, description, quantity,
   location, barcode). The member reviews/corrects it and saves.
4. The item is created, then the photo is attached to it.

**Acceptance criteria**
- Camera permission is requested; a denial shows an explanation and a retry
  action instead of a dead screen.
- The suggested name/description is editable and never saved without the
  member reaching the save action (no auto-save from the vision call).
- Save requires a non-empty name; other fields are optional.
- On success the member lands on the new item's detail screen showing the
  photo.
- A photo can be retaken before saving.

**Backend dependencies**
- `POST /api/vision/describe-item` (existing)
- `POST /api/items` (existing)
- `POST /api/items/:id/image` (existing)

**Status:** implemented — [AddItemScreen.tsx](src/screens/AddItemScreen.tsx)

## FR2 — Scan a barcode/QR code to identify an item already in inventory

A member can scan a physical barcode/QR code stuck on an item to jump
straight to its record, instead of searching by name.

**Flow**
1. Member taps **Scan Barcode** and points the camera at a code.
2. The app looks the scanned value up against stored items.
3. A match opens that item's detail screen. No match offers **Add as New
   Item** so the flow doesn't dead-end.

**Acceptance criteria**
- Recognizes QR, EAN-13/8, UPC-A/E, Code128, Code39.
- A duplicate scan of the same code while a lookup is in flight is ignored
  (no repeat requests from the continuous scanner).
- No match shows the scanned value and an explicit "Add as New Item" action
  rather than an error dead-end.

**Backend dependencies**
- `items.barcode` column (new, nullable, unique) — added in
  `database/migrations/0009_add_barcode_to_items.sql`
- `GET /api/items/barcode/:code` (new) — added in `Server/ServerMain.cpp`
- Barcode is optional on create/update via the existing item JSON payload.

**Status:** implemented — [ScanScreen.tsx](src/screens/ScanScreen.tsx)

## FR3 — Scan an item from a picture and display its information

A member can photograph an item that has no barcode (or one they don't want
to dig for) and have the app try to identify which existing inventory
record it is, showing that item's information.

**Flow**
1. Member taps **Identify by Photo** and takes a photo of the item.
2. The app sends the photo to the vision endpoint for a name/description
   guess, then ranks existing inventory items by word overlap with that
   guess.
3. Ranked candidates are listed for the member to pick from; tapping one
   opens its detail screen.
4. If nothing looks right (or the list is empty), **Not Listed — Add as New
   Item** carries the photo and suggestion forward into the FR1 add flow so
   the member doesn't retake the picture.

**Acceptance criteria**
- This is best-effort text matching against the vision suggestion, not a
  true image-similarity search — the UI presents results as "possible
  matches" (a list), never as a single asserted identification.
- Zero candidates is a valid, clearly-labeled outcome, not an error state.
- The "add as new" fallback reuses the same photo and suggested
  name/description already captured, without a second camera step.

**Backend dependencies**
- `POST /api/vision/describe-item` (existing)
- `GET /api/items` (existing) — full list is fetched client-side and ranked
  locally; there is no server-side search/match endpoint today.

**Status:** implemented — [IdentifyScreen.tsx](src/screens/IdentifyScreen.tsx)

## FR4 — Create a profile and log in

A person creates a Member profile (name + password) once, then logs in on
later visits. See `SCHEDULING_FUNCTIONAL_REQUIREMENTS.md` FR-0, FR-1 for the
full spec this and FR5-FR8 below implement.

**Flow**
1. On first launch, the person taps **Need a profile? Create one** from the
   Login screen, enters name/email/password, picks a profile color, and
   submits.
2. The server creates the account (Member role, shown as a circle in the
   chosen color with their initials — no photo involved) and returns a session token, which the app
   stores and use silently on every request afterward.
3. On later launches, a stored token skips Login entirely and lands on
   Member Home; otherwise Login is shown.

**Acceptance criteria**
- Password must be at least 8 characters (enforced client- and
  server-side).
- A duplicate email is rejected with a clear error, not a generic failure.
- Logging out clears the stored token and returns to Login.

**Backend dependencies**
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` (new)
- `users` / `sessions` tables (new) — `database/migrations/0012`, `0013`

**Status:** implemented — [LoginScreen.tsx](src/screens/LoginScreen.tsx), [RegisterScreen.tsx](src/screens/RegisterScreen.tsx)

## FR5 — View my upcoming duties

**Flow:** Member Home → My Duties lists every upcoming Sunday
duty the Member is on (as primary or support), soonest first.

**Backend dependencies:** `GET /api/duties/me` (new)

**Status:** implemented — [MyDutiesScreen.tsx](src/screens/MyDutiesScreen.tsx)

## FR6 — Mark general availability

**Flow:** Member Home → Availability Calendar → tap a date to toggle it as
a day the Member expects not to be at church. Informational only — no
message, no approval (that's FR7, and only once a duty actually
collides with a marked date).

**Backend dependencies:** `GET/POST /api/availability`, `DELETE /api/availability/:date` (new)

**Status:** implemented — [AvailabilityCalendarScreen.tsx](src/screens/AvailabilityCalendarScreen.tsx)

## FR7 — Request time off for a specific duty

**Flow:** My Duties flags any duty whose date collides with a
general-calendar mark; tapping it (or any duty without an existing
request) opens a message form. Submitting requires a non-empty message and
creates a pending request an Admin must approve/deny (desktop app).

**Backend dependencies:** `POST /api/duties/:id/non-availability-requests` (new)

**Status:** implemented — [NonAvailabilityRequestScreen.tsx](src/screens/NonAvailabilityRequestScreen.tsx)

## FR8 — View my request statuses

**Flow:** Member Home → My Requests lists every request the Member has
submitted with its current status (pending/approved/denied).

**Backend dependencies:** `GET /api/non-availability-requests/me` (new)

**Status:** implemented — [MyRequestsScreen.tsx](src/screens/MyRequestsScreen.tsx)

## Out of scope (for now)

- True visual/image-embedding matching (FR3 is currently text-based via the
  vision model's description, not a photo-to-photo image comparison).
- Editing or deleting items, and tag/category management, from mobile.
- Offline support — every flow above requires a live connection to
  `PottersPortalServer`.
- Admin-only scheduling flows (duty CRUD, non-availability
  approve/deny) — those are desktop-only, see
  `SCHEDULING_FUNCTIONAL_REQUIREMENTS.md`.
