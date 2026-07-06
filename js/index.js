// Seiten-Logik für die Tagesübersicht. Die heutige Einteilung berechnet sich live
// aus dem dauerhaften Wochenplan plus einer Differenz für genau diesen Tag
// (removed/added) – Änderungen am Wochenplan zeigen sich also sofort auch heute,
// außer für Personen, die für heute ausdrücklich entfernt oder zusätzlich
// eingeteilt wurden (× am Chip = "krank/verhindert für heute raus").

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

  watchStaff(data => { staffMap = data; renderAll(); });
  watchWorkingHours(data => { workingHoursMap = data; renderAll(); });
  watchWeeklyTemplate(data => { weeklyTemplate = data; renderAll(); });
  watchDailyOverride(dateISO, data => { dailyOverride = data; renderAll(); });
}

function mergedCells() {
  const template = weeklyTemplate[weekdayKey] || {};
  const removed = dailyOverride.removed || {};
  const added = dailyOverride.added || {};
  const result = {};
  SHIFTS.forEach(shift => {
    result[shift.key] = {};
    const templateShift = template[shift.key] || {};
    const removedShift = removed[shift.key] || {};
    const addedShift = added[shift.key] || {};
    ROOMS.forEach(room => {
      result[shift.key][room.key] = dailyMergedShiftRoom(templateShift, removedShift, addedShift, room.key);
    });
  });
  return result;
}

function renderAll() {
  if (!weekdayKey) return;

  const cells = mergedCells();

  renderRoomGrid(document.getElementById("room-grid"), {
    weekdayKey,
    cells,
    staffMap,
    workingHoursMap,
    editable: true,
    pickup: { personId: dailyOverride.pickup || null },
    onDrop: (shift, room, staffId) => addStaffToDailyCell(dateISO, weekdayKey, shift, room, staffId),
    onRemove: (shift, room, staffId) => removeStaffFromDailyCell(dateISO, weekdayKey, shift, room, staffId),
    onTogglePickup: staffId => setPickupPerson(dateISO, staffId)
  });

  const activeIds = Object.keys(staffMap).filter(id => staffMap[id].aktiv !== false);
  renderStaffSidebar(document.getElementById("sidebar"), activeIds, staffMap, workingHoursMap, weekdayKey, cells);
}
