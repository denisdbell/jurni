/* ------------------------------------------------------------------
   Jurni prototype — mock data + lightweight persistence store
   No backend. Mutable collections are mirrored to localStorage so the
   SOS → admin alert flow works across pages. Reload-safe; call
   Store.reset() (or the admin "Reset demo" button) to re-seed.
   ------------------------------------------------------------------ */

/* Coverage zones (per the proposal: Kingston, St. Andrew & Portmore) */
const ZONES = [
  "Downtown",
  "New Kingston",
  "Half Way Tree",
  "Constant Spring",
  "Papine",
  "Liguanea",
  "Portmore",
];

/* Recommended zone-pair fares in JMD (symmetric lookup table).
   Keyed "A|B"; helper fareFor() handles either direction. */
const FARE_TABLE = {
  "Downtown|New Kingston": 800,
  "Downtown|Half Way Tree": 700,
  "Downtown|Constant Spring": 1100,
  "Downtown|Papine": 1200,
  "Downtown|Liguanea": 950,
  "Downtown|Portmore": 1300,
  "New Kingston|Half Way Tree": 500,
  "New Kingston|Constant Spring": 750,
  "New Kingston|Papine": 850,
  "New Kingston|Liguanea": 600,
  "New Kingston|Portmore": 1500,
  "Half Way Tree|Constant Spring": 550,
  "Half Way Tree|Papine": 800,
  "Half Way Tree|Liguanea": 650,
  "Half Way Tree|Portmore": 1400,
  "Constant Spring|Papine": 900,
  "Constant Spring|Liguanea": 700,
  "Constant Spring|Portmore": 1700,
  "Papine|Liguanea": 500,
  "Papine|Portmore": 1800,
  "Liguanea|Portmore": 1600,
};

/* Base fare for a short trip that starts & ends in the same zone (JMD) */
const IN_ZONE_FARE = 400;

/* Named pickup/drop-off locations across the coverage area, each mapped to the
   zone that sets its fare. Powers the rider's text-drop (typeahead). */
const LOCATIONS = [
  // Downtown
  { name: "Coronation Market", zone: "Downtown" },
  { name: "Parade / St William Grant Park", zone: "Downtown" },
  { name: "Kingston Waterfront", zone: "Downtown" },
  { name: "Ocean Boulevard", zone: "Downtown" },
  { name: "Tivoli Gardens", zone: "Downtown" },
  { name: "Rae Town", zone: "Downtown" },
  { name: "Hanover Street", zone: "Downtown" },
  // New Kingston
  { name: "Emancipation Park", zone: "New Kingston" },
  { name: "Knutsford Boulevard", zone: "New Kingston" },
  { name: "Devon House", zone: "New Kingston" },
  { name: "Trafalgar Road", zone: "New Kingston" },
  { name: "National Stadium", zone: "New Kingston" },
  { name: "Cross Roads", zone: "New Kingston" },
  { name: "New Kingston Business District", zone: "New Kingston" },
  // Half Way Tree
  { name: "Half Way Tree Transport Centre", zone: "Half Way Tree" },
  { name: "Half Way Tree Square", zone: "Half Way Tree" },
  { name: "Maxfield Avenue", zone: "Half Way Tree" },
  { name: "Eastwood Park Gardens", zone: "Half Way Tree" },
  { name: "Richmond Park", zone: "Half Way Tree" },
  { name: "Mandela Park", zone: "Half Way Tree" },
  // Constant Spring
  { name: "Manor Park Plaza", zone: "Constant Spring" },
  { name: "Constant Spring Market", zone: "Constant Spring" },
  { name: "Meadowbrook", zone: "Constant Spring" },
  { name: "Red Hills Road", zone: "Constant Spring" },
  { name: "Grants Pen", zone: "Constant Spring" },
  { name: "Stony Hill", zone: "Constant Spring" },
  // Papine
  { name: "UWI Mona", zone: "Papine" },
  { name: "UTech Jamaica", zone: "Papine" },
  { name: "Papine Square", zone: "Papine" },
  { name: "August Town", zone: "Papine" },
  { name: "Mona Heights", zone: "Papine" },
  { name: "Hope Botanical Gardens", zone: "Papine" },
  { name: "Gordon Town", zone: "Papine" },
  // Liguanea
  { name: "Sovereign Centre", zone: "Liguanea" },
  { name: "Liguanea Plaza", zone: "Liguanea" },
  { name: "Barbican", zone: "Liguanea" },
  { name: "Matilda's Corner", zone: "Liguanea" },
  { name: "Old Hope Road", zone: "Liguanea" },
  { name: "Jacks Hill", zone: "Liguanea" },
  // Portmore
  { name: "Portmore Mall", zone: "Portmore" },
  { name: "Portmore Pines Plaza", zone: "Portmore" },
  { name: "Greater Portmore", zone: "Portmore" },
  { name: "Braeton", zone: "Portmore" },
  { name: "Gregory Park", zone: "Portmore" },
  { name: "Independence City", zone: "Portmore" },
  { name: "Hellshire", zone: "Portmore" },
  { name: "Caymanas", zone: "Portmore" },
];

/* Approx zone centroids (lat/lng) — used to map a GPS fix to the nearest zone.
   Free browser GPS + Haversine, no maps SDK (the proposal's exact technique). */
const ZONE_CENTROIDS = {
  "Downtown": { lat: 17.970, lng: -76.793 },
  "New Kingston": { lat: 18.008, lng: -76.785 },
  "Half Way Tree": { lat: 18.011, lng: -76.797 },
  "Constant Spring": { lat: 18.040, lng: -76.800 },
  "Papine": { lat: 18.018, lng: -76.742 },
  "Liguanea": { lat: 18.020, lng: -76.762 },
  "Portmore": { lat: 17.960, lng: -76.880 },
};

/* Drivers (first one matches the figure in the proposal PDF) */
const DRIVERS = [
  { id: "d1", name: "Marlon", vehicle: "Toyota Axio (silver)", plate: "1234 AB", rating: 4.8, phone: "876-555-0101" },
  { id: "d2", name: "Shanice", vehicle: "Honda Fit (white)", plate: "8842 CJ", rating: 4.9, phone: "876-555-0147" },
  { id: "d3", name: "Devon", vehicle: "Toyota Probox (white)", plate: "5521 KM", rating: 4.6, phone: "876-555-0188" },
];

/* The signed-in rider for this demo */
const RIDER = {
  name: "Alicia", fullName: "Alicia Brown",
  phone: "876-555-0199", email: "",
  signUpMethod: "Email", phoneVerified: false,
  rating: 4.9, emergencyContact: "Marcia · 876-555-0010", security: [],
};

/* ---------- Profile avatars ----------
   Every rider/driver gets a real headshot photo (committed under
   docs/img/avatars/, so it works offline on GitHub Pages). Each spec pairs the
   photo with a brand-tinted gradient that shows as a placeholder disc while the
   image loads and tints the status ring. Keyed by first name; avatarSpec()
   falls back to a deterministic photo from the pool so names that only appear
   in seed strings (e.g. "Marlon Reid") still resolve to a real face. */
const AVATAR_DIR = "img/avatars/";
const AVATAR_PALETTE = [
  ["#0e5a68", "#4fc3d4"],
  ["#0a3d47", "#2bb673"],
  ["#1f8a8f", "#9fe0e8"],
  ["#5b6cff", "#4fc3d4"],
  ["#f5a623", "#e5484d"],
  ["#9b59b6", "#4fc3d4"],
  ["#ff7a59", "#f5a623"],
  ["#128277", "#7ed9c3"],
];
const AVATARS = {
  marlon:  { photo: "marlon.jpg",  bg: ["#0e5a68", "#4fc3d4"] },
  shanice: { photo: "shanice.jpg", bg: ["#9b59b6", "#4fc3d4"] },
  devon:   { photo: "devon.jpg",   bg: ["#0a3d47", "#2bb673"] },
  alicia:  { photo: "alicia.jpg",  bg: ["#ff7a59", "#f5a623"] },
  kemar:   { photo: "kemar.jpg",   bg: ["#128277", "#7ed9c3"] },
  tanya:   { photo: "tanya.jpg",   bg: ["#5b6cff", "#4fc3d4"] },
  omar:    { photo: "omar.jpg",    bg: ["#1f8a8f", "#9fe0e8"] },
  andre:   { photo: "andre.jpg",   bg: ["#0e5a68", "#2bb673"] },
  keisha:  { photo: "keisha.jpg",  bg: ["#9b59b6", "#9fe0e8"] },
  marcia:  { photo: "marcia.jpg",  bg: ["#f5a623", "#e5484d"] },
};
/* Fallback faces (incl. a spare) for any name not in AVATARS. */
const AVATAR_POOL = [
  "generic.jpg", "marlon.jpg", "shanice.jpg", "devon.jpg", "alicia.jpg",
  "kemar.jpg", "tanya.jpg", "omar.jpg", "andre.jpg", "keisha.jpg", "marcia.jpg",
];
function avatarSpec(name, role) {
  const key = String(name || "").trim().toLowerCase().split(/\s+/)[0];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  if (AVATARS[key]) {
    return { photo: AVATAR_DIR + AVATARS[key].photo, bg: AVATARS[key].bg };
  }
  const bg = AVATAR_PALETTE[h % AVATAR_PALETTE.length];
  const photo = AVATAR_DIR + AVATAR_POOL[h % AVATAR_POOL.length];
  return { photo, bg };
}

/* Incoming ride requests shown to a driver */
const SEED_REQUESTS = [
  { id: "r101", rider: "Alicia", riderRating: 4.9, from: "New Kingston", to: "Papine", fare: 850, note: "At the gas station" },
  { id: "r102", rider: "Kemar", riderRating: 4.7, from: "Half Way Tree", to: "Liguanea", fare: 650, note: "2 passengers" },
  { id: "r103", rider: "Tanya", riderRating: 5.0, from: "Constant Spring", to: "New Kingston", fare: 750, note: "" },
];

/* Rider ride history */
const SEED_HISTORY = [
  { id: "h1", from: "New Kingston", to: "Downtown", fare: 800, date: "Oct 12", driver: "Shanice", rating: 5 },
  { id: "h2", from: "Half Way Tree", to: "Papine", fare: 800, date: "Oct 9", driver: "Marlon", rating: 5 },
  { id: "h3", from: "Liguanea", to: "Portmore", fare: 1600, date: "Oct 4", driver: "Devon", rating: 4 },
];

/* Admin: users */
const SEED_USERS = [
  { id: "u1", name: "Alicia Brown", role: "Rider", status: "Active", joined: "Sep 28", rating: 4.9,
    email: "alicia@example.com", phone: "876-555-0199", signUpMethod: "Email", phoneVerified: true,
    emergencyContact: "Marcia · 876-555-0010", securityQuestions: 2 },
  { id: "u2", name: "Marlon Reid", role: "Driver", status: "Active", joined: "Sep 15", rating: 4.8,
    email: "marlon@example.com", phone: "876-555-0101", signUpMethod: "Email", phoneVerified: true,
    emergencyContact: "Simone · 876-555-0120", securityQuestions: 2 },
  { id: "u3", name: "Shanice Green", role: "Driver", status: "Active", joined: "Sep 20", rating: 4.9,
    email: "shanice@example.com", phone: "876-555-0147", signUpMethod: "Email", phoneVerified: true,
    emergencyContact: "Paulette · 876-555-0171", securityQuestions: 2 },
  { id: "u4", name: "Kemar Daley", role: "Rider", status: "Active", joined: "Oct 1", rating: 4.7,
    email: "kemar@gmail.com", phone: "876-555-0150", signUpMethod: "Google", phoneVerified: true,
    emergencyContact: "Donna · 876-555-0133", securityQuestions: 2 },
  { id: "u5", name: "Devon Clarke", role: "Driver", status: "Suspended", joined: "Aug 30", rating: 4.6,
    email: "devon@example.com", phone: "876-555-0188", signUpMethod: "Email", phoneVerified: false,
    emergencyContact: "—", securityQuestions: 2 },
  { id: "u6", name: "Tanya Lewis", role: "Rider", status: "Active", joined: "Oct 10", rating: 5.0,
    email: "tanya@gmail.com", phone: "876-555-0160", signUpMethod: "Google", phoneVerified: true,
    emergencyContact: "Keisha · 876-555-0199", securityQuestions: 2 },
];

/* Admin: verification queue */
const SEED_VERIFICATIONS = [
  { id: "v1", name: "Omar Wright", role: "Driver", docs: "Licence, Registration, Insurance, Police Record", submitted: "Oct 14", status: "Pending" },
  { id: "v2", name: "Keisha Morgan", role: "Rider", docs: "Government ID", submitted: "Oct 14", status: "Pending" },
  { id: "v3", name: "Andre Campbell", role: "Driver", docs: "Licence, Insurance, Police Record", submitted: "Oct 13", status: "Pending" },
];

/* Admin: rides activity */
const SEED_RIDES = [
  { id: "t1", rider: "Alicia", driver: "Shanice", from: "New Kingston", to: "Downtown", fare: 800, status: "Completed", time: "Today 09:14" },
  { id: "t2", rider: "Kemar", driver: "Marlon", from: "Half Way Tree", to: "Liguanea", fare: 650, status: "In progress", time: "Today 10:02" },
  { id: "t3", rider: "Tanya", driver: "Devon", from: "Constant Spring", to: "Papine", fare: 900, status: "Completed", time: "Today 08:31" },
  { id: "t4", rider: "Alicia", driver: "Marlon", from: "Half Way Tree", to: "Papine", fare: 800, status: "Cancelled", time: "Yesterday 17:40" },
];

/* Admin: emergency alerts (SOS). Seeded with one; rider/driver SOS adds more. */
const SEED_ALERTS = [
  {
    id: "a1", type: "Report", from: "Tanya (Rider)", ride: "Constant Spring → Papine",
    driver: "Devon · Toyota Probox · 5521 KM", gps: "18.0179, -76.7490",
    note: "Driver took an unexpected detour.", time: "Today 08:40", acknowledged: false,
  },
];

/* Fare lookup (direction-independent). Prefers admin-edited fares in the
   Store so changes on the admin dashboard propagate to riders/drivers. */
function fareFor(a, b) {
  if (!a || !b || a === b) return null;
  let table = FARE_TABLE;
  try { table = (typeof Store !== "undefined" && Store.get("fares")) || FARE_TABLE; } catch (e) {}
  return table[`${a}|${b}`] ?? table[`${b}|${a}`] ?? null;
}

/* Fare between two zones, including same-zone trips (base fare). */
function zoneFare(a, b) {
  if (!a || !b) return null;
  return a === b ? IN_ZONE_FARE : fareFor(a, b);
}

/* Great-circle distance in km between {lat,lng} points (Haversine). */
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* Nearest coverage zone to a GPS fix. */
function nearestZone(lat, lng) {
  let best = null, bestKm = Infinity;
  for (const [zone, c] of Object.entries(ZONE_CENTROIDS)) {
    const km = haversineKm({ lat, lng }, c);
    if (km < bestKm) { bestKm = km; best = zone; }
  }
  return best;
}

/* ---------- Persistence store ----------
   Only the collections the demo mutates are persisted. */
const Store = (function () {
  const KEY = "jurni.proto.v1";
  const seed = () => ({
    alerts: JSON.parse(JSON.stringify(SEED_ALERTS)),
    verifications: JSON.parse(JSON.stringify(SEED_VERIFICATIONS)),
    users: JSON.parse(JSON.stringify(SEED_USERS)),
    rides: JSON.parse(JSON.stringify(SEED_RIDES)),
    fares: { ...FARE_TABLE },
  });

  let mem = null; // fallback when localStorage is unavailable (some file:// contexts)

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    } catch (e) {
      if (!mem) mem = seed();
      return mem;
    }
  }
  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      mem = state;
    }
  }

  return {
    get(coll) { return load()[coll]; },
    set(coll, value) { const s = load(); s[coll] = value; save(s); },
    update(fn) { const s = load(); fn(s); save(s); return s; },
    addAlert(alert) {
      const s = load();
      s.alerts.unshift(alert);
      save(s);
    },
    reset() {
      try { localStorage.removeItem(KEY); } catch (e) { mem = null; }
      return load();
    },
  };
})();
