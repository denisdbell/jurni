# Jurni — clickable prototype

A dependency-free, mobile-responsive HTML prototype of the **Jurni bare-bones
ride MVP** (per `Jurni-DevProposal-BareBonesMVP.pdf`). It walks the full product
— **Rider**, **Driver**, and **Admin** — with simulated data and no backend.

Brand (teal / aqua, the lowercase **jurni** wordmark, *"Move with ease"*) is
taken from the client's own WhatsApp brand assets, not the proposal template.

## Run it

Just open **`index.html`** in a browser — plain `file://` works.

For the most reliable experience (and so the **SOS → admin alert** flow shares
state across the rider/driver/admin pages via `localStorage`), serve the folder:

```bash
cd prototype
python3 -m http.server 8000
# then open http://localhost:8000
```

## Screen map

- **`index.html`** — branded landing + role picker (and roadmap services).
- **`rider.html`** — phone login → OTP → ID + emergency contact → request a ride
  (**type any Kingston location** or **📍 use current location / GPS**) →
  fare / negotiate → finding a driver → **driver-distance bar until the driver
  arrives**, then a **second bar while riding to the destination** → pay cash +
  rate → ride history → **Emergency / SOS** (on both legs).
- **`driver.html`** — sign in / upload docs → **Submit → "pending approval"
  screen** → (demo continue / sign in as approved) go online → request list →
  accept / counter → **heading to pickup** (share GPS + distance bar) → **driving
  to destination** (second distance bar) → complete + rate rider → earnings →
  **SOS**. Both legs show **Open in Waze / Google Maps** buttons (display-only in
  the prototype — the live app launches turn-by-turn).
- **`admin.html`** — overview stats · verifications (approve/reject) · users
  (search / suspend) · **zone fare table** (editable) · rides · **emergency
  alerts** (acknowledge).

## Try the end-to-end demo

1. **Rider** → request New Kingston → Papine → find a driver → watch the bar
   fill to *Arrived* → pay + rate. Open **SOS** and tap *Alert Jurni admin*.
2. **Admin** → **Emergency alerts** → the SOS you just fired appears (with a
   captured GPS coordinate) → **Acknowledge** it.
3. **Admin** → **Zone fares** → change a cell → **Save** → it updates the fare
   the Rider sees.

## What's simulated (prototype only)

- No real auth/SMS — any OTP works; document uploads are mocked. A new driver's
  **Submit** lands on a *pending approval* screen (a demo button continues in).
- The **driver-distance bars** fill on a timer (not real GPS). The production
  build uses the free browser Geolocation API + Haversine, per the proposal.
- **Rider locations** are named places mapped to the 7 fare **zones**; fares stay
  zone-based. **📍 Use my current location** calls the real Geolocation API and
  maps the fix to the nearest zone (Haversine) — needs a secure context, so run
  over `http://localhost` (below), not `file://`. It falls back gracefully if
  permission is denied.
- Rider "finding a driver" and driver "accept" are scripted, not a live match.
- Data lives in `localStorage` under `jurni.proto.v1`. Use **Admin → Reset demo
  data** (or clear the key) to re-seed.
- Scope is the **ride** MVP only; grocery / package / card payments shown on the
  landing page are roadmap flavor, not built.

## Structure

```
prototype/
├── index.html · rider.html · driver.html · admin.html
├── css/  tokens.css · base.css · phone.css · admin.css
└── js/   data.js · ui.js · rider.js · driver.js · admin.js
```

No build step, no frameworks, no external calls (fonts load from Google Fonts
when online; everything still works offline with system fonts).
