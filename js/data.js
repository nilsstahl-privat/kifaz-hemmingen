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
      if (day.pickup === staffId) {
        day.pickup = null;
        changed = true;
      }
      ["removed", "added"].forEach(kind => {
        const tree = day[kind] || {};
        for (const shift of Object.keys(tree)) {
          for (const room of Object.keys(tree[shift] || {})) {
            const arr = tree[shift][room] || [];
            if (arr.includes(staffId)) {
              tree[shift][room] = arr.filter(id => id !== staffId);
              changed = true;
            }
          }
        }
      });
    }
    if (changed) db.ref("dailyOverrides").set(overrides);
  });
}

// basePath ist "weeklyTemplate/mo" etc. (Wochenplanung). Für die Tagesübersicht
// gibt es die eigenen Funktionen addStaffToDailyCell/removeStaffFromDailyCell
// weiter unten, die nicht den Wochenplan selbst verändern.
//
// Sicherheitsregel: Eine Person kann nie gleichzeitig in zwei Räumen derselben
// Schicht stehen (wohl aber in unterschiedlichen Räumen verschiedener Schichten,
// z.B. vormittags Küche, ab 13:00 Sonne). Beim Zuordnen wird sie deshalb zuerst
// aus allen anderen Räumen dieser einen Schicht entfernt.
function addStaffToCell(basePath, shiftKey, roomKey, staffId) {
  const shiftPath = basePath + "/" + shiftKey;
  db.ref(shiftPath).once("value").then(snap => {
    const shiftData = snap.val() || {};
    ROOMS.forEach(room => {
      if (room.key === roomKey) return;
      const arr = shiftData[room.key] || [];
      if (arr.includes(staffId)) {
        const filtered = arr.filter(id => id !== staffId);
        if (filtered.length) shiftData[room.key] = filtered;
        else delete shiftData[room.key];
      }
    });
    const targetArr = shiftData[roomKey] || [];
    if (!targetArr.includes(staffId)) targetArr.push(staffId);
    shiftData[roomKey] = targetArr;
    db.ref(shiftPath).set(shiftData);
  });
}

function removeStaffFromCell(basePath, shiftKey, roomKey, staffId) {
  const path = basePath + "/" + shiftKey + "/" + roomKey;
  db.ref(path).once("value").then(snap => {
    const arr = (snap.val() || []).filter(id => id !== staffId);
    db.ref(path).set(arr.length ? arr : null);
  });
}

// --- Tages-Ausnahmen für die Tagesübersicht ---
//
// Werden NICHT als Kopie des Wochenplans gespeichert, sondern als Differenz
// (removed/added) dazu. Dadurch wirken sich Änderungen am dauerhaften
// Wochenplan sofort auch auf den heutigen Tag aus – außer für Personen, die
// für genau diesen einen Tag ausdrücklich entfernt oder zusätzlich
// eingeteilt wurden, das bleibt unabhängig vom Wochenplan bestehen.

function dailyMergedShiftRoom(templateShift, removedShift, addedShift, roomKey) {
  const templateArr = (templateShift && templateShift[roomKey]) || [];
  const removedArr = (removedShift && removedShift[roomKey]) || [];
  const addedArr = (addedShift && addedShift[roomKey]) || [];
  const base = templateArr.filter(id => !removedArr.includes(id));
  const extra = addedArr.filter(id => !base.includes(id));
  return base.concat(extra);
}

// Wie addStaffToCell, aber für die Tages-Ausnahme: schreibt nie in den
// Wochenplan selbst, sondern nur in removed/added für dieses eine Datum.
// Dieselbe Sicherheitsregel gilt: nie zwei Räume gleichzeitig in derselben Schicht.
function addStaffToDailyCell(dateISO, weekdayKey, toShift, toRoom, staffId) {
  const templatePath = "weeklyTemplate/" + weekdayKey + "/" + toShift;
  const removedPath = "dailyOverrides/" + dateISO + "/removed/" + toShift;
  const addedPath = "dailyOverrides/" + dateISO + "/added/" + toShift;

  Promise.all([
    db.ref(templatePath).once("value").then(s => s.val() || {}),
    db.ref(removedPath).once("value").then(s => s.val() || {}),
    db.ref(addedPath).once("value").then(s => s.val() || {})
  ]).then(([templateShift, removedShift, addedShift]) => {
    ROOMS.forEach(room => {
      if (room.key === toRoom) return;
      const inThisRoom = dailyMergedShiftRoom(templateShift, removedShift, addedShift, room.key).includes(staffId);
      if (!inThisRoom) return;
      if ((templateShift[room.key] || []).includes(staffId)) {
        const removedArr = removedShift[room.key] || [];
        if (!removedArr.includes(staffId)) removedShift[room.key] = removedArr.concat(staffId);
      } else {
        const addedArr = (addedShift[room.key] || []).filter(id => id !== staffId);
        if (addedArr.length) addedShift[room.key] = addedArr;
        else delete addedShift[room.key];
      }
    });

    if ((templateShift[toRoom] || []).includes(staffId)) {
      const removedArr = (removedShift[toRoom] || []).filter(id => id !== staffId);
      if (removedArr.length) removedShift[toRoom] = removedArr;
      else delete removedShift[toRoom];
    } else {
      const addedArr = addedShift[toRoom] || [];
      if (!addedArr.includes(staffId)) addedShift[toRoom] = addedArr.concat(staffId);
    }

    db.ref(removedPath).set(removedShift);
    db.ref(addedPath).set(addedShift);
  });
}

function removeStaffFromDailyCell(dateISO, weekdayKey, shiftKey, roomKey, staffId) {
  const templatePath = "weeklyTemplate/" + weekdayKey + "/" + shiftKey + "/" + roomKey;
  const removedPath = "dailyOverrides/" + dateISO + "/removed/" + shiftKey + "/" + roomKey;
  const addedPath = "dailyOverrides/" + dateISO + "/added/" + shiftKey + "/" + roomKey;

  db.ref(templatePath).once("value").then(snap => {
    const templateArr = snap.val() || [];
    if (templateArr.includes(staffId)) {
      db.ref(removedPath).once("value").then(rSnap => {
        const arr = rSnap.val() || [];
        if (!arr.includes(staffId)) db.ref(removedPath).set(arr.concat(staffId));
      });
    } else {
      db.ref(addedPath).once("value").then(aSnap => {
        const arr = (aSnap.val() || []).filter(id => id !== staffId);
        db.ref(addedPath).set(arr.length ? arr : null);
      });
    }
  });
}

// Wer holt heute um 12:20 die Heimgehkinder ab? Nur eine Person pro Tag;
// nochmaliges Antippen derselben Person hebt die Zuteilung wieder auf.
function setPickupPerson(dateISO, staffId) {
  db.ref("dailyOverrides/" + dateISO + "/pickup").once("value").then(snap => {
    db.ref("dailyOverrides/" + dateISO + "/pickup").set(snap.val() === staffId ? null : staffId);
  });
}
