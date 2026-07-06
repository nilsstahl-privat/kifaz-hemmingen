// Gemeinsame Lese-/Schreib-Helfer rund um /staff, /workingHours, /weeklyTemplate
// und /dailyOverrides. Funktioniert unverändert mit der echten Firebase-DB
// und mit der Fake-DB (js/fake-db.js), da beide dieselbe ref()-API bieten.

function watchStaff(callback) {
  db.ref("staff").on("value", snap => callback(snap.val() || {}));
}

function watchWorkingHours(callback) {
  db.ref("workingHours").on("value", snap => callback(snap.val() || {}));
}

function watchWeeklyTemplate(callback) {
  db.ref("weeklyTemplate").on("value", snap => callback(snap.val() || {}));
}

function watchDailyOverride(dateISO, callback) {
  db.ref("dailyOverrides/" + dateISO).on("value", snap => callback(snap.val() || {}));
}

function addStaff(staffData) {
  const ref = db.ref("staff").push();
  ref.set(Object.assign({ aktiv: true }, staffData));
  return ref.key;
}

function updateStaff(staffId, staffData) {
  db.ref("staff/" + staffId).update(staffData);
}

function setWorkingHours(staffId, dayKey, hours) {
  db.ref("workingHours/" + staffId + "/" + dayKey).set(hours);
}

// Entfernt eine Person komplett: Stammdaten, Arbeitszeiten und alle Vorkommen
// in Wochenplan und Tages-Ausnahmen (damit keine verwaisten IDs übrig bleiben).
function deleteStaffEverywhere(staffId) {
  db.ref("staff/" + staffId).remove();
  db.ref("workingHours/" + staffId).remove();

  db.ref("weeklyTemplate").once("value").then(snap => {
    const tmpl = snap.val() || {};
    let changed = false;
    for (const day of Object.keys(tmpl)) {
      for (const shift of Object.keys(tmpl[day] || {})) {
        for (const room of Object.keys(tmpl[day][shift] || {})) {
          const arr = tmpl[day][shift][room] || [];
          if (arr.includes(staffId)) {
            tmpl[day][shift][room] = arr.filter(id => id !== staffId);
            changed = true;
          }
        }
      }
    }
    if (changed) db.ref("weeklyTemplate").set(tmpl);
  });

  db.ref("dailyOverrides").once("value").then(snap => {
    const overrides = snap.val() || {};
    let changed = false;
    for (const date of Object.keys(overrides)) {
      const day = overrides[date] || {};
      const assignments = day.assignments || {};
      for (const shift of Object.keys(assignments)) {
        for (const room of Object.keys(assignments[shift] || {})) {
          const arr = assignments[shift][room] || [];
          if (arr.includes(staffId)) {
            assignments[shift][room] = arr.filter(id => id !== staffId);
            changed = true;
          }
        }
      }
    }
    if (changed) db.ref("dailyOverrides").set(overrides);
  });
}

// basePath ist entweder "weeklyTemplate/mo" (Wochenplanung) oder
// "dailyOverrides/2026-07-06/assignments" (Tages-Ausnahme).
function addStaffToCell(basePath, shiftKey, roomKey, staffId) {
  const path = basePath + "/" + shiftKey + "/" + roomKey;
  db.ref(path).once("value").then(snap => {
    const arr = snap.val() || [];
    if (!arr.includes(staffId)) {
      arr.push(staffId);
      db.ref(path).set(arr);
    }
  });
}

function removeStaffFromCell(basePath, shiftKey, roomKey, staffId) {
  const path = basePath + "/" + shiftKey + "/" + roomKey;
  db.ref(path).once("value").then(snap => {
    const arr = (snap.val() || []).filter(id => id !== staffId);
    db.ref(path).set(arr.length ? arr : null);
  });
}

// Kopiert den Wochenplan eines Wochentags einmalig in die Tages-Ausnahme,
// damit anschließende Drag&Drop-Änderungen für diesen einen Tag unabhängig
// vom dauerhaften Wochenplan bearbeitet werden können.
function ensureDailyAssignmentsInitialized(weekdayKey, dateISO) {
  const overridePath = "dailyOverrides/" + dateISO + "/assignments";
  return db.ref(overridePath).once("value").then(snap => {
    if (snap.val()) return;
    return db.ref("weeklyTemplate/" + weekdayKey).once("value").then(tSnap => {
      return db.ref(overridePath).set(tSnap.val() || {});
    });
  });
}
