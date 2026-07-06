# Mittagsplaner – KiFaZ

Online-Tool für die Personalplanung beim offenen Mittagessen: Tagesübersicht, Wochenplanung
per Drag & Drop, Personal- und Arbeitszeitenverwaltung.

Reines HTML/CSS/JavaScript, keine Build-Tools nötig. Als Datenbank wird Firebase Realtime
Database genutzt (kostenlose Spark-Stufe reicht locker).

## Schriften & Icons

Überschriften/Labels nutzen **Bebas Neue**, Fließtext **Muli** – beide lokal eingebunden über
`css/fonts.css` + `css/fonts/*.woff2` (keine Google-Fonts-/CDN-Abhängigkeit mehr, funktioniert
auch offline). Icons: eine kleine, selbst gehostete Auswahl an Font-Awesome-Solid-Icons
(`css/fonts/fa-solid-900.woff2`), nur für die aktuell genutzten Symbole. Neues Icon hinzufügen:
in `css/fonts.css` eine Zeile `.fa-<name>::before { content: "\f..."; }` mit dem passenden
FA6-Unicode-Codepoint ergänzen.

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

**Status:** lokal fertig eingerichtet und commited, aber noch **nicht** auf GitHub – das kann nur
mit deinem GitHub-Account passieren. Für den gemeinsamen Test mit einer Kollegin sind beide
Schritte (Firebase + GitHub Pages) nötig, sonst sieht sie nur ihre eigene, lokale Version.

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

1. Auf [github.com/new](https://github.com/new) ein neues, **leeres** Repository anlegen (kein
   README/.gitignore ankreuzen, das haben wir schon lokal)
2. Diese zwei Befehle im Projektordner ausführen (Terminal fragt beim Push nach GitHub-Login/Token,
   falls noch nicht eingerichtet):

```bash
git remote add origin https://github.com/DEIN-NUTZERNAME/kifaz-mittagsplaner.git
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
                                                          ("garten" ist ein reiner
                                                          Tages-Pseudo-Raum, kommt hier nie vor)
/weeklyTemplate/{mo..fr}/pickup/{p1|p2} staffId – wiederkehrender Standard (2 Slots,
                                                    per Dropdown in der Wochenplanung
                                                    gewählt): wer holt an diesem
                                                    Wochentag die Heimgehkinder ab
/dailyOverrides/{datumISO}/removed/{a|b}/{raum}  [staffId, ...] – für heute aus dieser
                                                   Wochenplan-Zelle entfernt (z.B. krank)
/dailyOverrides/{datumISO}/added/{a|b}/{raum}    [staffId, ...] – für heute zusätzlich in
                                                   diese Zelle (nicht im Wochenplan), inkl.
                                                   Zuordnungen zum Pseudo-Raum "garten"
/dailyOverrides/{datumISO}/pickup/{p1|p2}  staffId | "" – Tages-Sonderregel (Dropdown in
                                        der Tagesübersicht); Objekt fehlt = wiederkehrender
                                        Standard aus dem Wochenplan gilt für beide Slots
/dailyOverrides/{datumISO}/gartenModus  true | (fehlt) – Garten-Modus für diesen einen Tag
                                        (nur Tagesübersicht): fasst alle Nicht-Küche-Räume
                                        zu einer "Garten"-Gruppe zusammen
```

Die Tagesübersicht speichert also nie eine Kopie des Wochenplans, sondern nur die Differenz
dazu. Änderungen am Wochenplan wirken sich dadurch sofort auch auf den aktuellen Tag aus –
außer für Zellen, die für genau diesen einen Tag ausdrücklich angepasst wurden (× am Chip =
für heute raus, z.B. krank/verhindert; Drag & Drop/Antippen aus dem Pool = spontane
Zusatzkraft oder länger Bleibende).

## Lokal starten

Über den `preview_start`-Workflow (Claude Code) oder manuell:

```bash
python3 -m http.server 4321
```

und dann `http://localhost:4321` öffnen.
