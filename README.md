# Mittagsplaner – Kita Hemmingen

Online-Tool für die Personalplanung beim offenen Mittagessen: Tagesübersicht, Wochenplanung
per Drag & Drop, Personal- und Arbeitszeitenverwaltung.

Reines HTML/CSS/JavaScript, keine Build-Tools nötig. Als Datenbank wird Firebase Realtime
Database genutzt (kostenlose Spark-Stufe reicht locker).

## Schriften & Icons

Überschriften/Labels nutzen **Bebas Neue**, Fließtext **Mulish** (= Muli) – beides aktuell über
Google Fonts eingebunden (`<link>` in jeder HTML-Datei), da die Original-Dateien (`Muli-*.woff2`)
noch nicht im Projekt liegen. Icons kommen über Font Awesome (CDN). Sobald die lokalen
`.woff2`-Dateien vorliegen, können sie in `css/` abgelegt und per `@font-face` eingebunden werden –
die restlichen `font-family`-Angaben im CSS bleiben dabei unverändert.

## Seiten

- `index.html` – Tagesübersicht: heutige Raumeinteilung, direkt bearbeitbar (Person für heute raus per ×, spontane Zusatzkräfte oder länger Bleibende per Drag & Drop), ohne den Wochenplan zu verändern
- `week.html` – Wochenübersicht & -planung: dauerhafter Wochenplan per Drag & Drop
- `staff.html` – Personal anlegen/löschen, Arbeitszeiten pro Wochentag pflegen

## Ohne jedes Setup ausprobieren

Die App läuft sofort auch ohne Firebase-Konto: solange `js/config.js` noch die
Platzhalter-Werte enthält, speichert sie alle Daten nur lokal im Browser
(localStorage). So lässt sich alles direkt ausprobieren – die Daten sind dann
aber nicht zwischen Geräten/Personen geteilt.

## Einrichtung für den echten, gemeinsam genutzten Betrieb

### 1. Firebase-Projekt anlegen (kostenlos)

1. Auf [console.firebase.google.com](https://console.firebase.google.com) ein neues Projekt anlegen
2. Im Menü **Build → Realtime Database** → "Datenbank erstellen" (Region z.B. Europe)
3. Zunächst im Testmodus starten
4. Unter **Projekteinstellungen → Allgemein → Meine Apps** eine neue Web-App hinzufügen, den
   angezeigten `firebaseConfig`-Block kopieren
5. Diese Werte in [js/config.js](js/config.js) anstelle der `DEIN_...`-Platzhalter eintragen
6. In der Firebase-Konsole unter **Realtime Database → Regeln** den Inhalt von
   [firebase-rules.json](firebase-rules.json) einfügen und veröffentlichen (nur lesen/schreiben,
   keine Zugriffsbeschränkung – ausreichend für ein internes Team-Tool, Link nicht öffentlich teilen)

### 2. Auf GitHub veröffentlichen

```bash
git remote add origin https://github.com/DEIN-NUTZERNAME/kita-mittagsplaner.git
git branch -M main
git push -u origin main
```

### 3. Kostenlos hosten mit GitHub Pages

Repo auf GitHub → **Settings → Pages** → unter "Build and deployment" als Branch `main` und
Ordner `/ (root)` auswählen → Speichern. Die Seite ist danach unter
`https://DEIN-NUTZERNAME.github.io/kita-mittagsplaner/` erreichbar.

## Startdaten

Beim allerersten Aufruf (egal ob Fake-DB oder echtes Firebase) befüllt
[js/seed-data.js](js/seed-data.js) die Datenbank automatisch mit dem aktuellen Personal,
den Arbeitszeiten (Stand 22.5.26) und dem Version-B-Raumplan aus dem Briefing. Das passiert
nur, wenn die Datenbank noch komplett leer ist – bestehende Änderungen werden nie überschrieben.

## Datenmodell (Realtime Database)

```
/staff/{staffId}                     name, gruppe, notiz, aktiv
/workingHours/{staffId}/{mo..fr}      start, end, frei
/weeklyTemplate/{mo..fr}/{a|b}/{raum} [staffId, ...]   – a = 11:45–13:00, b = ab 13:00
/dailyOverrides/{datumISO}/assignments/{a|b}/{raum}     [staffId, ...] – Tages-Ausnahme
                                                          (× am Chip = für heute raus, z.B.
                                                          krank/verhindert; Drag & Drop = spontane
                                                          Zusatzkraft oder länger Bleibende)
```

## Lokal starten

Über den `preview_start`-Workflow (Claude Code) oder manuell:

```bash
python3 -m http.server 4321
```

und dann `http://localhost:4321` öffnen.
