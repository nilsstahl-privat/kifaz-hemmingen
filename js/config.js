// Firebase-Projekt-Konfiguration.
// Solange apiKey noch "DEIN_API_KEY" ist, läuft die App im lokalen Test-Modus
// (Daten werden nur im Browser des jeweiligen Nutzers via localStorage gespeichert,
// nicht geteilt). Sobald hier echte Werte aus der Firebase-Konsole eingetragen sind,
// wechselt die App automatisch auf die echte, geteilte Datenbank.
const CONFIG = {
  firebase: {
    apiKey: "AIzaSyD1fhBuWvyID3RwcIF9KifQOQgbgS-sM7Y",
    authDomain: "kifaz-hemmingen-16f5a.firebaseapp.com",
    databaseURL: "https://kifaz-hemmingen-16f5a-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "kifaz-hemmingen-16f5a",
    storageBucket: "kifaz-hemmingen-16f5a.firebasestorage.app",
    messagingSenderId: "67168129116",
    appId: "1:67168129116:web:81c03652d7731409ffd699"
  }
};
