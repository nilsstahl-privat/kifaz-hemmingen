// Read-only-Anbindung an die Personalplanung (Tool "kita-arbeitszeitplaner").
//
// Zeigt in der Tagesübersicht an, wer laut Personalplanung am GEWÄHLTEN Tag NICHT
// da ist (Urlaub, krank, Gleittag, Fortbildung, Geburtstag). So sieht das Team
// beim Planen des Mittagessens sofort, mit wem es an dem Tag nicht rechnen kann.
//
// WICHTIG – bewusst defensiv:
//  * Rein LESEND. Schreibt niemals in die Datenbank und fasst weder die Daten des
//    Mittagstools noch die der Personalplanung an.
//  * Liest aus demselben Firebase-Projekt, nur unter dem eigenen Pfad der
//    Personalplanung ("arbeitszeitplaner/…").
//  * Fällt bei jedem Problem lautlos aus (Panel bleibt leer/versteckt), damit die
//    Mittagsplanung durch diese Zusatzinfo NIE beeinträchtigt werden kann.
(function () {
  const ROOT = "arbeitszeitplaner";

  // Menschlich lesbare Kurzform der Abwesenheitsgründe (aus der Personalplanung).
  const GRUND_LABEL = {
    krankheit: "krank",
    urlaub: "Urlaub",
    gleittag: "Gleittag",
    geburtstag: "Geburtstag",
    fortbildung: "Fortbildung"
  };

  let ppAbsences = {};
  let ppPersons = {};
  let currentDateISO = null;

  function start() {
    if (typeof db === "undefined" || !db) return; // ohne DB nichts zu tun
    try {
      db.ref(ROOT + "/absences").on(
        "value",
        snap => { ppAbsences = snap.val() || {}; rerender(); },
        () => {} // Lesefehler ignorieren – Panel bleibt einfach leer
      );
      db.ref(ROOT + "/persons").on(
        "value",
        snap => { ppPersons = snap.val() || {}; rerender(); },
        () => {}
      );
    } catch (e) {
      // Anbindung ist optional und darf die Mittagsplanung niemals stören.
    }
  }

  function personName(id) {
    const p = ppPersons[id];
    if (!p) return id;
    const n = [p.vorname, p.nachname].filter(Boolean).join(" ").trim();
    return n || p.name || id;
  }

  function isWeekday(dateISO) {
    const parts = dateISO.split("-").map(Number);
    const wd = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    return wd >= 1 && wd <= 5;
  }

  // Wer ist an diesem Datum abwesend? Nur bestätigte Einträge (Entwürfe zählen nicht).
  function absentOn(dateISO) {
    const out = [];
    Object.keys(ppAbsences).forEach(id => {
      const a = ppAbsences[id];
      if (!a || a.status === "entwurf") return;
      let on;
      if (a.umfang === "ganz") on = a.vonDatum <= dateISO && dateISO <= a.bisDatum;
      else on = a.datum === dateISO;
      if (!on) return;

      let zeit = "";
      if (a.umfang === "halb") {
        if (a.vonZeit && a.bisZeit) zeit = a.vonZeit + "–" + a.bisZeit;
        else if (a.vonZeit) zeit = "ab " + a.vonZeit;
        else if (a.bisZeit) zeit = "bis " + a.bisZeit;
        else zeit = "halber Tag";
      }
      out.push({
        name: personName(a.personId),
        grund: GRUND_LABEL[a.grund] || a.grund || "",
        halb: a.umfang === "halb",
        zeit: zeit
      });
    });
    out.sort((x, y) => x.name.localeCompare(y.name, "de"));
    return out;
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  // Wird von index.js in renderAll() aufgerufen – LÄUFT VOR dem Rendern des
  // Raum-Grids. Deshalb hier hart gekapselt: darf unter keinen Umständen eine
  // Exception werfen, sonst würde die restliche Mittagsplanung nicht mehr rendern.
  window.renderPpPanel = function (dateISO) {
    try {
      currentDateISO = dateISO;
      rerender();
    } catch (e) {
      // Bewusst verschluckt – Zusatzinfo darf die Mittagsplanung nie blockieren.
    }
  };

  function rerender() {
    const el = document.getElementById("pp-panel");
    if (!el) return;
    const dateISO = currentDateISO;
    const list = (dateISO && isWeekday(dateISO)) ? absentOn(dateISO) : [];
    if (!list.length) { el.style.display = "none"; el.innerHTML = ""; return; }

    const items = list.map(x => {
      const detail = x.halb
        ? ` <span class="pp-detail">(halber Tag${x.zeit ? ", " + esc(x.zeit) : ""})</span>`
        : "";
      return `<li><strong>${esc(x.name)}</strong> – ${esc(x.grund)}${detail}</li>`;
    }).join("");

    el.style.display = "";
    el.innerHTML =
      `<div class="pp-head">Abwesend <span class="pp-src">· laut Personalplanung</span></div>` +
      `<ul class="pp-list">${items}</ul>`;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
