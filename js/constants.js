// Gemeinsame Konstanten für alle Seiten.

const WEEKDAYS = [
  { key: "mo", label: "Montag" },
  { key: "di", label: "Dienstag" },
  { key: "mi", label: "Mittwoch" },
  { key: "do", label: "Donnerstag" },
  { key: "fr", label: "Freitag" }
];

// JS Date.getDay(): 0=So, 1=Mo, ... 6=Sa
const JS_WEEKDAY_TO_KEY = { 1: "mo", 2: "di", 3: "mi", 4: "do", 5: "fr" };

const SHIFTS = [
  { key: "a", label: "11:45–13:00" },
  { key: "b", label: "ab 13:00" }
];

// checkMin: false → Raum wird nicht in die "Unterbesetzt"-Warnung einbezogen
// (Schlafraum ist normalerweise mit 1 Person besetzt).
const ROOMS = [
  { key: "kueche", label: "Küche", checkMin: true },
  { key: "schlafraum", label: "Schlafraum", checkMin: false },
  { key: "sonne", label: "Sonne", checkMin: true },
  { key: "wiese", label: "Wiese", checkMin: true },
  { key: "mond", label: "Mond", checkMin: true },
  { key: "turnraum", label: "Turnraum", checkMin: true }
];

const MIN_PER_ROOM = 2;

// Ungefähre Uhrzeit-Fenster pro Schicht, nur zur Erkennung von
// Arbeitszeit-Konflikten beim Drag & Drop (keine exakte Minutensteuerung).
const SHIFT_WINDOWS = {
  a: [11 * 60 + 45, 13 * 60],
  b: [13 * 60, 13 * 60 + 30]
};

const GRUPPEN = [
  { key: "sonne", label: "Sonne" },
  { key: "wiese", label: "Wiese" },
  { key: "mond", label: "Mond" },
  { key: "", label: "keine" }
];

function todayWeekdayKey() {
  return weekdayKeyForDate(todayISO());
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Wochentag für ein beliebiges Datum (nicht nur heute) – z.B. für die
// vorausschauende Tagesübersicht. Bewusst über Jahr/Monat/Tag konstruiert
// (nicht new Date(iso)), damit es unabhängig von der Zeitzone immer den
// richtigen lokalen Wochentag liefert.
function weekdayKeyForDate(dateISO) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return JS_WEEKDAY_TO_KEY[date.getDay()] || null;
}

function addDaysToISO(dateISO, deltaDays) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + deltaDays);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function weekdayLabel(key) {
  const wd = WEEKDAYS.find(w => w.key === key);
  return wd ? wd.label : key;
}

// "2026-07-06" -> "06.07.2026"
function formatDateDMY(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function roomLabel(key) {
  const r = ROOMS.find(r => r.key === key);
  return r ? r.label : key;
}

// Sicher für Text-Inhalt (innerHTML von Textknoten).
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

// Sicher für die Verwendung innerhalb von HTML-Attributen (z.B. value="...", title="...").
function escAttr(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
