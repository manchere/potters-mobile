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
1. Member taps **Find item** and points the camera at a code.
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

**Status:** implemented — [FindItemScreen.tsx](src/screens/FindItemScreen.tsx)

## FR3 — Scan an item from a picture and display its information

A member can photograph an item that has no barcode (or one they don't want
to dig for) and have the app try to identify which existing inventory
record it is, showing that item's information.

**Flow**
1. Member taps **Find item** and, with no code to scan, takes a photo of
   the item with the shutter button.
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

**Status:** implemented — [FindItemScreen.tsx](src/screens/FindItemScreen.tsx) (the same
camera as FR2: a code in view is looked up, the shutter identifies by photo)

## FR4 — Create a profile and log in

A person creates a Member profile (name + password) once, then logs in on
later visits. See `SCHEDULING_FUNCTIONAL_REQUIREMENTS.md` FR-0, FR-1 for the
full spec this and FR5-FR8 below implement.

**Flow**
1. On a phone no one has signed in on yet, the app opens on Create
   Profile (later, it's **New here? Create your profile** on the Login
   screen). The person enters name/phone number/password, picks a profile color (any color),
   and submits.
2. The server creates the account (Member role, shown as a circle in the
   chosen color with their initials — no photo involved) and returns a session token, which the app
   stores and use silently on every request afterward.
3. On later launches, a stored token skips Login entirely and lands on
   Member Home; otherwise Login is shown. The member stays signed in until
   they sign out: the server extends the session on every use (180 days
   from the last use), and the app confirms the stored token in the
   background (`GET /api/auth/me`) without blocking Home. Only a definite
   401 returns them to Login, with a "sign-in has expired" note; being
   offline or the server waking up does not.

**Acceptance criteria**
- Password must be at least 8 characters (enforced client- and
  server-side).
- A duplicate phone number is rejected with a clear error, not a generic failure.
- The first profile ever created becomes the Admin.
- Logging out clears the stored token and returns to Login (after a
  confirmation); the Login screen pre-fills the last phone number used.

**Backend dependencies**
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/auth/me` (new)
- `users` / `sessions` tables (new) — `database/migrations/0012`, `0013`

**Status:** implemented — [LoginScreen.tsx](src/screens/LoginScreen.tsx), [RegisterScreen.tsx](src/screens/RegisterScreen.tsx)

## FR5 — View my upcoming duties

**Flow:** the Duties tab lists every upcoming Sunday duty the Member is
on, grouped by Sunday, soonest first. Each shows whether they're serving
or the backup, and who serves and who backs up together with their color
badges (SCHEDULING FR-7.4). Member Home shows the next one.

**Backend dependencies:** `GET /api/duties/me` (new)

**Status:** implemented — Schedule tab › My duties, [MyDutiesView.tsx](src/screens/MyDutiesView.tsx)

## FR6 — Mark general availability

**Flow:** Member Home → Time off tab → tap a Sunday to toggle it as a day the
Member expects not to be at church. Only Sundays are shown (one tile per
Sunday, a month at a time), since duties only happen on Sundays; past
Sundays can't be changed. Informational only — no
message, no approval (that's FR7, and only once a duty actually
collides with a marked date).

**Backend dependencies:** `GET/POST /api/availability`, `DELETE /api/availability/:date` (new)

**Status:** implemented — [AvailabilityCalendarScreen.tsx](src/screens/AvailabilityCalendarScreen.tsx)

## FR7 — Request time off for a specific duty

**Flow:** Schedule › My duties flags any duty whose date collides with a
general-calendar mark; tapping it (or any duty without an existing
request) opens a message form. Submitting requires a non-empty message and
creates a pending request an Admin must approve/deny (desktop app).

**Backend dependencies:** `POST /api/duties/:id/non-availability-requests` (new)

**Status:** implemented — [NonAvailabilityRequestScreen.tsx](src/screens/NonAvailabilityRequestScreen.tsx)

## FR8 — View my request statuses

**Flow:** Time off tab, under the Sundays marked away, lists every request
the Member has submitted with its current status (pending/approved/denied).

**Backend dependencies:** `GET /api/non-availability-requests/me` (new)

Each request shows the duty and date it's about.

**Status:** implemented — [AvailabilityCalendarScreen.tsx](src/screens/AvailabilityCalendarScreen.tsx), [RequestCard.tsx](src/ui/RequestCard.tsx)

## FR9 — See the Sunday schedule

**Flow:** Schedule tab › Sunday → everyone serving on a Sunday (duty, who serves,
backup, notes), a week at a time; the member's own duties are marked.
Admins can add a duty on an upcoming Sunday, or tap one to change who
serves, the backup and the notes, or remove it. Past Sundays are
read-only for everyone.

**Backend dependencies:** `GET /api/schedule/:date`, `GET /api/duty-types`,
`GET /api/members`, `POST /api/duties`, `PUT/DELETE /api/duties/:id`
(Admins only) (new)

**Status:** implemented — [ScheduleScreen.tsx](src/screens/ScheduleScreen.tsx), [DutyEditScreen.tsx](src/screens/DutyEditScreen.tsx)

## FR10 — Schedule reports, songs and feedback

- **Reports** (Schedule tab › History): who did what on past Sundays (last month / 3 months /
  year), filterable by member or duty, with the same availability tags as
  the desktop report. Shareable as text with the Reports "create" right.
- **Songs:** the song library with key, play link and lyrics; add, edit
  and delete follow the Songs rights.
- **Feedback:** send a problem, an idea or a profile change (Feedback
  "create"); with "update"/"delete", see everyone's requests and mark
  them done or delete them.

**Backend dependencies:** `GET /api/reports/schedule`, `GET/POST /api/songs`,
`PUT/DELETE /api/songs/:id`, `GET/POST /api/feedback`,
`PATCH/DELETE /api/feedback/:id` (new)

**Status:** implemented — [ReportsView.tsx](src/screens/ReportsView.tsx), [SongsScreen.tsx](src/screens/SongsScreen.tsx), [FeedbackScreen.tsx](src/screens/FeedbackScreen.tsx)

## Access rights

What each member sees follows the desktop's Settings > Access Rights
(`GET /api/access/me`, cached on the phone): Reports, Songs and Feedback
appear only with "view" (Feedback: with any right), and each add / edit /
change-status / delete button only with the matching right — including
Inventory. The server checks the same rights on every change. Schedule
changes are for Admins only, as on the desktop.

## UI

The app uses the desktop app's colors (src/theme): the phone's light mode
matches the desktop "Light" theme, dark mode matches "Navy & Gold". A
bottom tab bar holds Home, Schedule, Time off, Inventory (with Inventory
"view") and Profile. Each place covers one job:

- **Schedule** switches between *Sunday* (everyone serving, a week at a
  time), *My duties* and, with the Reports right, *History*.
- **Time off** holds the Sundays marked away and the time-off requests sent.
- **Find item** is one camera for barcode lookup and identify-by-photo.

Home's quick actions are each member's own pick. **Edit** beside Quick
actions shows the shortcuts on Home (tap − to remove) and, under "More
shortcuts", every other one their rights allow (tap + to add):

| Shortcut | Opens | Needs |
|---|---|---|
| Sunday schedule *(default)* | Schedule › Sunday | — |
| My duties | Schedule › My duties | — |
| Schedule history | Schedule › History | Reports "view" |
| Time off *(default)* | Time off | — |
| My time-off requests | Time off, scrolled to the requests | — |
| Inventory *(default)* | Inventory | Inventory "view" |
| Find item | Find item camera | Inventory "view" |
| Add item | Add Item | Inventory "create" |
| Songs | Songs | Songs "view" |
| Feedback *(default)* | Feedback | any Feedback right |

Until a member changes them, Home shows the four defaults (each only with
the right it needs). The choice is kept on the phone, per member, and
survives signing out. Dates read day first
("Sun 4 Oct 2026") like the desktop.

## Out of scope (for now)

- True visual/image-embedding matching (FR3 is currently text-based via the
  vision model's description, not a photo-to-photo image comparison).
- Editing or deleting items, and tag/category management, from mobile.
- Offline support — every flow above requires a live connection to
  `PottersPortalServer`.
- Admin-only scheduling flows (duty CRUD, non-availability
  approve/deny) — those are desktop-only, see
  `SCHEDULING_FUNCTIONAL_REQUIREMENTS.md`.
