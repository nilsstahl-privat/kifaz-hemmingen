// Seiten-Logik für die Tagesübersicht. Die heutige Einteilung berechnet sich live
// aus dem dauerhaften Wochenplan plus einer Differenz für genau diesen Tag
// (removed/added) – Änderungen am Wochenplan zeigen sich also sofort auch heute,
// außer für Personen, die für heute ausdrücklich entfernt oder zusätzlich
// eingeteilt wurden (× am Chip = "krank/verhindert für heute raus").
//
// Garten-Modus: nur hier (nicht in der Wochenplanung) verfügbarer Umschalter,
// der alle Nicht-Küche-Räume für diesen Tag zu einer einzigen "Garten"-Gruppe
// zusammenfasst.

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
    title.textContent = "Heute (" + formatDateDMY(dateISO) + ") – am Wochenende gibt es keinen Mittagsplan";
    document.getElementById("day-content").style.display = "none";
    return;
  }
  title.textContent = weekdayLabel(weekdayKey) + ", " + formatDateDMY(dateISO);

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
    // "garten" ist ein reiner Tages-Pseudo-Raum für den Garten-Modus, kommt nie
    // im Wochenplan vor – hier landen nur Personen, die heute explizit rein gezogen wurden.
    result[shift.key].garten = dailyMergedShiftRoom(templateShift, removedShift, addedShift, "garten");
  });
  return result;
}

// Wer holt heute die Heimgehkinder ab? Eine Tages-Sonderregel überschreibt beide
// Slots und geht vor dem wiederkehrenden Wochenplan-Standard.
function effectivePickupSlots() {
  const daily = dailyOverride.pickup;
  const isOverridden = daily !== undefined && daily !== null && typeof daily === "object";
  const source = isOverridden ? daily : ((weeklyTemplate[weekdayKey] && weeklyTemplate[weekdayKey].pickup) || {});
  return { p1: source.p1 || "", p2: source.p2 || "", isOverridden };
}

function renderAll() {
  if (!weekdayKey) return;

  const cells = mergedCells();
  const gartenModus = !!dailyOverride.gartenModus;
  const pickupSlots = effectivePickupSlots();

  renderModeToggle(gartenModus);
  renderPickupEditor(pickupSlots);

  renderRoomGrid(document.getElementById("room-grid"), {
    weekdayKey,
    cells,
    staffMap,
    workingHoursMap,
    editable: true,
    gartenModus,
    pickup: { activeIds: [pickupSlots.p1, pickupSlots.p2].filter(Boolean) },
    onDrop: (shift, room, staffId) => addStaffToDailyCell(dateISO, weekdayKey, shift, room, staffId),
    onRemove: (shift, room, staffId) => removeStaffFromDailyCell(dateISO, weekdayKey, shift, room, staffId)
  });

  const activeIds = Object.keys(staffMap).filter(id => staffMap[id].aktiv !== false);
  renderStaffSidebar(document.getElementById("sidebar"), activeIds, staffMap, workingHoursMap, weekdayKey, cells);
}

function renderModeToggle(gartenModus) {
  const el = document.getElementById("mode-toggle");
  if (!el) return;
  el.innerHTML = `
    <button type="button" class="${!gartenModus ? "active" : ""}" onclick="setMode(false)">Räume</button>
    <button type="button" class="${gartenModus ? "active" : ""}" onclick="setMode(true)">Garten</button>
  `;
}

function setMode(enabled) {
  setGartenModus(dateISO, enabled);
}

function renderPickupEditor(slots) {
  const el = document.getElementById("pickup-editor");
  if (!el) return;
  const resetBtn = slots.isOverridden
    ? `<button type="button" class="btn small secondary" onclick="resetDailyPickup()">Zurücksetzen auf Wochenplan-Standard</button>`
    : "";
  el.innerHTML = `
    <strong>Abholung 12:20 heute:</strong>
    <select onchange="onDailyPickupChange('p1', this.value)">${renderStaffSelectOptions(staffMap, slots.p1)}</select>
    <select onchange="onDailyPickupChange('p2', this.value)">${renderStaffSelectOptions(staffMap, slots.p2)}</select>
    ${resetBtn}
  `;
}

function onDailyPickupChange(slot, staffId) {
  const current = effectivePickupSlots();
  const updated = { p1: current.p1, p2: current.p2 };
  updated[slot] = staffId;
  setDailyPickup(dateISO, updated);
}

function resetDailyPickup() {
  clearDailyPickupOverride(dateISO);
}
