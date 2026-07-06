// Seiten-Logik für die Tagesübersicht. Die heutige Einteilung ist direkt
// bearbeitbar (wie die Wochenplanung), schreibt aber in eine Tages-Ausnahme
// statt in den dauerhaften Wochenplan. So lassen sich spontan zusätzliche
// Personen reinziehen oder jemand für heute entfernen (× am Chip = "krank/
// verhindert für heute raus"), ohne den Wochenplan zu verändern.

let staffMap = {};
let workingHoursMap = {};
let weeklyTemplate = {};
let dailyOverride = {};

const weekdayKey = todayWeekdayKey();
const dateISO = todayISO();

document.addEventListener("DOMContentLoaded", init);

function init() {
  if (USING_FAKE_DB) document.getElementById("fake-db-banner").style.display = "";

  const title = document.getElementById("day-title");
  if (!weekdayKey) {
    title.textContent = "Heute (" + dateISO + ") – am Wochenende gibt es keinen Mittagsplan";
    document.getElementById("day-content").style.display = "none";
    return;
  }
  title.textContent = weekdayLabel(weekdayKey) + ", " + dateISO;

  seedIfEmpty();
  ensureDailyAssignmentsInitialized(weekdayKey, dateISO);

  watchStaff(data => { staffMap = data; renderAll(); });
  watchWorkingHours(data => { workingHoursMap = data; renderAll(); });
  watchWeeklyTemplate(data => { weeklyTemplate = data; renderAll(); });
  watchDailyOverride(dateISO, data => { dailyOverride = data; renderAll(); });
}

function mergedCells() {
  const template = weeklyTemplate[weekdayKey] || {};
  const overrideAssignments = dailyOverride.assignments || {};
  const result = {};
  SHIFTS.forEach(shift => {
    result[shift.key] = {};
    ROOMS.forEach(room => {
      const overrideArr = overrideAssignments[shift.key] && overrideAssignments[shift.key][room.key];
      const templateArr = (template[shift.key] && template[shift.key][room.key]) || [];
      result[shift.key][room.key] = overrideArr !== undefined ? overrideArr.slice() : templateArr.slice();
    });
  });
  return result;
}

function renderAll() {
  if (!weekdayKey) return;

  renderRoomGrid(document.getElementById("room-grid"), {
    weekdayKey,
    cells: mergedCells(),
    staffMap,
    workingHoursMap,
    editable: true,
    onDrop: (shift, room, staffId) =>
      addStaffToCell("dailyOverrides/" + dateISO + "/assignments", shift, room, staffId),
    onRemove: (shift, room, staffId) =>
      removeStaffFromCell("dailyOverrides/" + dateISO + "/assignments", shift, room, staffId)
  });

  const activeIds = Object.keys(staffMap).filter(id => staffMap[id].aktiv !== false);
  renderStaffSidebar(document.getElementById("sidebar"), activeIds, staffMap, workingHoursMap, weekdayKey);
}
