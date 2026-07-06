// Einmalig genutzte Startdaten aus dem Briefing "Offenes Mittagessen – Kita Hemmingen"
// (Personal, Arbeitszeiten Stand 22.5.26, Raumplan Version B). Wird nur geschrieben,
// wenn die Datenbank noch komplett leer ist (siehe seedIfEmpty unten) – bestehende
// Änderungen des Nutzers werden dadurch nie überschrieben.

const SEED_STAFF = [
  { id: "nils", name: "Nils Stahl", gruppe: "sonne", notiz: "", aktiv: true },
  { id: "tina", name: "Tina", gruppe: "sonne", notiz: "geht jeden Tag um 13:00", aktiv: true },
  { id: "simon", name: "Simon Böthführ", gruppe: "sonne", notiz: "Fr: Naturkita, nicht im Haus", aktiv: true },
  { id: "lena", name: "Lena", gruppe: "sonne", notiz: "", aktiv: true },
  { id: "alex", name: "Alexandra Cotardo", gruppe: "wiese", notiz: "Mo/Di/Fr: Schlafraum (~12:00–13:00)", aktiv: true },
  { id: "anette", name: "Anette Siebeneich", gruppe: "wiese", notiz: "Teilzeit, meist bis 12:00–12:30", aktiv: true },
  { id: "semra", name: "Semra Jukic", gruppe: "wiese", notiz: "Anker der Wiese, nie in Küche", aktiv: true },
  { id: "kerstin", name: "Kerstin Pietsch", gruppe: "wiese", notiz: "Teilzeit, meist bis 12:30", aktiv: true },
  { id: "funda", name: "Funda Tugay", gruppe: "mond", notiz: "Inklu-Kraft", aktiv: true },
  { id: "christina", name: "Christina Eider", gruppe: "mond", notiz: "erst ab August wieder da", aktiv: false },
  { id: "lisa", name: "Lisa Burger", gruppe: "mond", notiz: "", aktiv: true },
  { id: "marina", name: "Marina Oxenius", gruppe: "mond", notiz: "Mi/Do: Schlafraum (~12:00–13:00)", aktiv: true },
  { id: "maria", name: "Maria Mehlhorn", gruppe: "wiese", notiz: "Teilzeit, meist bis 12:30, Regelkinder-Abholung", aktiv: true },
  { id: "viki", name: "Viktoria Hein", gruppe: "mond", notiz: "", aktiv: true },
  { id: "nico", name: "Nico", gruppe: "", notiz: "Noch keiner Gruppe zugeteilt, jeden Tag da, flexible Verstärkung", aktiv: true },
  { id: "merve", name: "Merve", gruppe: "", notiz: "Teilzeit morgens, nicht mittags relevant", aktiv: true },
  { id: "diana", name: "Diana", gruppe: "", notiz: "Jeden Tag Ersatzkraft, gezielt bei Engstellen", aktiv: true },
  { id: "selda", name: "Selda", gruppe: "", notiz: "Langfristig ggf. Küche allein, Zeiten noch nicht geprüft", aktiv: true }
];

// Stand 22.5.26. "–" aus dem Briefing wird zu { frei: true }.
const SEED_WORKING_HOURS = {
  nils:      { mo: t("7:50", "15:30"), di: frei(), mi: t("7:50", "15:30"), do: frei(), fr: frei() },
  tina:      { mo: t("8:30", "13:00"), di: t("8:30", "13:00"), mi: t("8:30", "13:00"), do: t("8:00", "13:00"), fr: t("8:30", "13:00") },
  simon:     { mo: t("11:00", "17:00"), di: t("7:50", "14:00"), mi: t("6:50", "16:00"), do: t("7:50", "16:00"), fr: frei() },
  lena:      { mo: t("8:00", "17:00"), di: t("8:00", "12:30"), mi: t("8:00", "17:00"), do: t("7:00", "14:00"), fr: t("8:00", "14:00") },
  alex:      { mo: t("8:00", "14:00"), di: t("9:00", "17:00"), mi: t("7:00", "14:00"), do: t("8:00", "17:00"), fr: t("7:00", "13:00") },
  anette:    { mo: frei(), di: frei(), mi: t("9:30", "12:00"), do: t("9:30", "12:30"), fr: t("8:00", "12:30") },
  semra:     { mo: t("7:00", "16:00"), di: t("7:00", "14:00"), mi: t("8:00", "14:00"), do: t("8:00", "14:00"), fr: t("8:00", "16:00") },
  kerstin:   { mo: frei(), di: t("8:30", "12:30"), mi: t("8:30", "12:30"), do: t("8:30", "12:30"), fr: frei() },
  funda:     { mo: t("8:00", "14:00"), di: t("8:00", "14:00"), mi: t("8:00", "13:30"), do: t("8:00", "13:30"), fr: t("8:00", "14:00") },
  christina: { mo: frei(), di: t("7:00", "15:00"), mi: t("8:00", "16:00"), do: t("8:00", "16:00"), fr: t("8:00", "14:00") },
  lisa:      { mo: t("8:00", "13:00"), di: t("8:00", "13:00"), mi: t("8:00", "13:00"), do: t("8:00", "14:00"), fr: t("8:00", "14:00") },
  marina:    { mo: t("8:00", "14:00"), di: t("9:00", "17:00"), mi: t("7:00", "14:00"), do: t("8:00", "17:00"), fr: t("7:00", "13:00") },
  maria:     { mo: t("7:00", "13:00"), di: t("8:00", "16:30"), mi: t("8:00", "16:30"), do: t("8:00", "14:00"), fr: t("8:00", "14:00") },
  viki:      { mo: t("7:00", "13:00"), di: t("8:00", "16:30"), mi: t("8:00", "16:30"), do: t("8:00", "14:00"), fr: t("8:00", "14:00") },
  nico:      { mo: t("8:00", "17:00"), di: t("8:00", "13:00"), mi: t("8:00", "14:00"), do: t("8:00", "17:00"), fr: t("8:00", "14:00") },
  merve:     { mo: frei(), di: frei(), mi: t("8:30", "12:10"), do: t("8:30", "12:10"), fr: t("8:30", "12:10") }
};

// Version B Raumplan. shift "a" = 11:45–13:00, shift "b" = ab 13:00.
const SEED_WEEKLY_TEMPLATE = {
  mo: {
    a: {
      kueche: ["nils", "marina"],
      turnraum: ["funda", "lisa", "viki"],
      sonne: ["tina", "lena", "simon"],
      wiese: ["semra", "nico", "anette"],
      schlafraum: ["alex"]
    },
    b: {
      kueche: ["nils", "marina"],
      turnraum: ["funda", "nico"],
      sonne: ["simon", "lena", "semra", "alex"]
    }
  },
  di: {
    a: {
      kueche: ["marina", "funda"],
      turnraum: ["lisa", "viki"],
      sonne: ["tina", "lena", "simon"],
      wiese: ["semra", "kerstin", "nico"],
      schlafraum: ["alex"]
    },
    b: {
      kueche: ["marina", "funda"],
      turnraum: ["viki", "simon"],
      wiese: ["semra", "alex"]
    }
  },
  mi: {
    a: {
      kueche: ["nils", "funda"],
      turnraum: ["tina", "lena", "simon"],
      wiese: ["semra", "nico", "alex", "kerstin"],
      mond: ["lisa", "viki"],
      schlafraum: ["marina"]
    },
    b: {
      kueche: ["nils", "funda"],
      turnraum: ["lena", "simon"],
      mond: ["viki", "marina", "semra", "nico"]
    }
  },
  do: {
    a: {
      kueche: ["viki", "lena"],
      turnraum: ["semra", "alex", "kerstin", "anette"],
      sonne: ["tina", "simon"],
      mond: ["lisa", "funda"],
      schlafraum: ["marina"]
    },
    b: {
      kueche: ["viki", "lena"],
      turnraum: ["semra", "nico", "simon"],
      mond: ["lisa", "marina"]
    }
  },
  fr: {
    a: {
      kueche: ["lisa", "viki"],
      turnraum: ["funda", "marina"],
      sonne: ["tina", "lena"],
      wiese: ["semra", "nico", "anette"],
      schlafraum: ["alex"]
    },
    b: {
      kueche: ["lisa", "viki"],
      turnraum: ["funda"],
      wiese: ["semra", "alex", "nico"]
    }
  }
};

function t(start, end) {
  return { start, end, frei: false };
}

function frei() {
  return { start: "", end: "", frei: true };
}

function seedIfEmpty() {
  db.ref("staff").once("value").then(snap => {
    if (snap.val()) return; // schon Daten vorhanden -> nichts überschreiben

    const staffObj = {};
    SEED_STAFF.forEach(s => {
      staffObj[s.id] = { name: s.name, gruppe: s.gruppe, notiz: s.notiz, aktiv: s.aktiv };
    });

    db.ref("staff").set(staffObj);
    db.ref("workingHours").set(SEED_WORKING_HOURS);
    db.ref("weeklyTemplate").set(SEED_WEEKLY_TEMPLATE);
    console.info("Startdaten aus dem Briefing wurden eingetragen.");
  });
}
