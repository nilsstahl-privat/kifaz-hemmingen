// Firebase-Projekt-Konfiguration.
// Solange apiKey noch "DEIN_API_KEY" ist, läuft die App im lokalen Test-Modus
// (Daten werden nur im Browser des jeweiligen Nutzers via localStorage gespeichert,
// nicht geteilt). Sobald hier echte Werte aus der Firebase-Konsole eingetragen sind,
// wechselt die App automatisch auf die echte, geteilte Datenbank.
const CONFIG = {
  firebase: {
    apiKey: "DEIN_API_KEY",
    authDomain: "DEIN_PROJEKT.firebaseapp.com",
    databaseURL: "https://DEIN_PROJEKT-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "DEIN_PROJEKT",
    storageBucket: "DEIN_PROJEKT.firebasestorage.app",
    messagingSenderId: "DEINE_SENDER_ID",
    appId: "DEINE_APP_ID"
  }
};
