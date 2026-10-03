# Potters Portal — Mobile

React Native (Expo) app for iOS/Android. It talks to `PottersPortalServer`
over HTTP — the same REST API the `web/` frontend uses — so it shares one
Postgres-backed source of truth with the desktop app and browser UI. It does
not embed any business logic; every read/write goes through the server's
`Controllers/`.

See [FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md) for the
detailed requirements and acceptance criteria behind each camera/scan flow.

## Screens

- **Item list** — browse inventory, pull to refresh.
- **Add item** (FR1) — opens the camera, takes a photo, sends it to
  `POST /api/vision/describe-item` (Groq vision) to pre-fill a name/description,
  then lets the member review/edit before saving. The photo is attached via
  `POST /api/items/:id/image` after the item is created.
- **Find item** (FR2 + FR3) — one camera for both ways of finding an item:
  - a barcode/QR code in view is looked up via
    `GET /api/items/barcode/:code` and opens that item. An unmatched code
    offers "Add as New Item" instead of dead-ending;
  - for an item without a code, the shutter takes a photo, gets a vision
    suggestion, then ranks it against every existing item's name to show
    "possible matches". No match carries the photo + suggestion forward
    into Add Item instead of dead-ending.
- **Item detail** — shows the stored photo, status, quantity, location, and
  barcode.

## Backend prerequisites

This app needs the corresponding backend changes, already applied in this
branch:

- `database/migrations/0009_add_barcode_to_items.sql` adds a nullable,
  unique `items.barcode` column.
- `Controllers/ItemController` gained `itemByBarcode()`.
- `Server/ServerMain.cpp` gained `GET /api/items/barcode/<code>`.

Run migrations and start `PottersPortalServer` before using the app.

## Running in Expo Go

The app uses only modules bundled in Expo Go (Expo SDK 57), so there is no
native build step. Install **Expo Go** from the App Store / Play Store; it
must support SDK 57 (the current store version does).

1. Start the backend on your computer (listens on port 8080):

   ```
   PottersPortalServer.exe
   ```

   On Windows, allow it through the firewall once so the phone can reach it
   (PowerShell as Administrator):

   ```
   New-NetFirewallRule -DisplayName "PottersPortalServer" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Private
   ```

2. Start Metro:

   ```
   cd mobile
   npm install
   npm start
   ```

3. Scan the QR code with the Camera app (iOS) or Expo Go (Android). The
   phone and computer must be on the same Wi-Fi.

The login screen shows which server the app is talking to at the bottom.

### How the server address is found

`src/config.ts` works it out in this order:

1. `EXPO_PUBLIC_API_URL` from `.env` (copy `.env.example`), if set.
2. **Automatic in Expo Go:** the computer's LAN IP that Metro is serving
   from, plus port 8080. Nothing to configure on the same Wi-Fi.
3. Emulators: `10.0.2.2:8080` (Android) or `localhost:8080` (iOS simulator).

### Different networks (tunnel)

If the phone can't be on the same Wi-Fi, tunnel both Metro and the server:

```
cloudflared tunnel --url http://localhost:8080     # prints an https URL
```

Put that URL in `mobile/.env` as `EXPO_PUBLIC_API_URL=...`, then run
`npm run start:tunnel`. Restart Metro after editing `.env`.

### Troubleshooting

- **"Can't reach the server at ..."**: the server isn't running, the
  firewall rule is missing, or the phone is on another network (guest Wi-Fi
  often isolates devices; use the tunnel).
- **"Project is incompatible with this version of Expo Go"**: update Expo Go
  from the store.

## Structure

```
mobile/
  App.tsx                  # entry point, mounts navigation
  src/
    config.ts               # API_BASE_URL resolution (Expo Go auto-detect)
    api/
      client.ts             # fetch wrapper, one method per endpoint
      types.ts               # Item/Tag/Category, mirrors Server/Json.cpp
    navigation/
      index.tsx              # stack navigator + route param types
    screens/
      ItemListScreen.tsx
      ItemDetailScreen.tsx
      AddItemScreen.tsx       # camera capture -> vision suggest -> save (FR1)
      FindItemScreen.tsx       # barcode -> lookup, or photo -> ranked matches (FR2, FR3)
```

## Not yet implemented

- Editing/deleting items, tag and category management (list-only against
  those endpoints today — `api.tags.list()` / `api.categories.list()` are
  wired up but no screens use them yet).
- Offline queueing — every action requires a live connection to the server.
- Auth — the REST API currently has none; add it at the server before
  shipping this beyond a trusted local network.
