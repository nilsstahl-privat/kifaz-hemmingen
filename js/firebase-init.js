// Initialisiert entweder die echte Firebase Realtime Database oder,
// solange js/config.js noch Platzhalterwerte enthält, die lokale Fake-DB.
const PLACEHOLDER_API_KEY = "DEIN_API_KEY";
const USING_FAKE_DB = !CONFIG.firebase.apiKey || CONFIG.firebase.apiKey === PLACEHOLDER_API_KEY;

let db;
if (USING_FAKE_DB) {
  db = createFakeDB();
  console.warn(
    "Firebase ist noch nicht konfiguriert (js/config.js). " +
    "Die App läuft im lokalen Test-Modus – Daten bleiben nur in diesem Browser gespeichert."
  );
} else {
  firebase.initializeApp(CONFIG.firebase);
  db = firebase.database();
}
