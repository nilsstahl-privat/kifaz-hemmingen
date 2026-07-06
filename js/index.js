// Seiten-Logik für die Tagesübersicht. Die Einteilung für den gewählten Tag
// berechnet sich live aus dem dauerhaften Wochenplan plus einer Differenz für
// genau dieses Datum (removed/added) – Änderungen am Wochenplan zeigen sich
// also sofort auch dort, außer für Personen, die für diesen einen Tag
// ausdrücklich entfernt oder zusätzlich eingeteilt wurden (× am Chip = "krank/
// verhindert raus"). Per Datums-Navigation lässt sich jeder beliebige Tag
// (auch weit im Voraus, z.B. für einen Ausflug) genauso bearbeiten wie heute.
//
// Garten-Modus: nur hier (nicht in der Wochenplanung) verfügbarer Umschalter,
// der alle Nicht-Küche-Räume für diesen Tag zu einer einzigen "Garten"-Gruppe
// zusammenfasst.

let staffMap = {};
let workingHoursMap = {};
let weeklyTemplate = {};
let dailyOverride = {};
let dailyOverrideRef = null;

let selectedDateISO = todayISO();
let weekdayKey = todayWeekdayKey();

document.addEventListener("DOMContentLoaded", init);

function init() {
  if (USING_FAKE_DB) document.getElementById("fake-db-banner").style.display = "";

  seedIfEmpty();

  watchStaff(data => { staffMap = data; renderAll(); });
  watchWorkingHours(data => { workingHoursMap = data; renderAll(); });
  watchWeeklyTemplate(data => { weeklyTemplate = data; renderAll(); });
  subscribeToSelectedDate();
}

function subscribeToSelectedDate() {
  if (dailyOverrideRef) dailyOverrideRef.off();
  dailyOverride = {};
  dailyOverrideRef = watchDailyOverride(selectedDateISO, data => { dailyOverride = data; renderAll(); });
}

function setSelectedDate(newDateISO) {
  if (!newDateISO || newDateISO === selectedDateISO) return;
  selectedDateISO = newDateISO;
  weekdayKey = weekdayKeyForDate(newDateISO);
  subscribeToSelectedDate();
  renderAll();
}

function shiftSelectedDate(deltaDays) {
  setSelectedDate(addDaysToISO(selectedDateISO, deltaDays));
}

function onDatePicked(value) {
  if (value) setSelectedDate(value);
}

function goToToday() {
  setSelectedDate(todayISO());
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
    // im Wochenplan vor – hier landen nur Personen, die für diesen Tag explizit rein gezogen wurden.
    result[shift.key].garten = dailyMergedShiftRoom(templateShift, removedShift, addedShift, "garten");
  });
  return result;
}

// Wer holt an diesem Tag die Heimgehkinder ab? Eine Tages-Sonderregel überschreibt
// beide Slots und geht vor dem wiederkehrenden Wochenplan-Standard.
function effectivePickupSlots() {
  const daily = dailyOverride.pickup;
  const isOverridden = daily !== undefined && daily !== null && typeof daily === "object";
  const source = isOverridden ? daily : ((weeklyTemplate[weekdayKey] && weeklyTemplate[weekdayKey].pickup) || {});
  return { p1: source.p1 || "", p2: source.p2 || "", isOverridden };
}

function renderAll() {
  renderDateNav();
  renderDailyNote();

  const title = document.getElementById("day-title");
  if (!weekdayKey) {
    title.textContent = formatDateDMY(selectedDateISO) + " – am Wochenende gibt es keinen Mittagsplan";
    document.getElementById("day-content").style.display = "none";
    document.getElementById("pickup-editor").style.display = "none";
    document.getElementById("mode-toggle").style.display = "none";
    return;
  }
  document.getElementById("day-content").style.display = "";
  document.getElementById("pickup-editor").style.display = "";
  document.getElementById("mode-toggle").style.display = "";
  title.textContent = weekdayLabel(weekdayKey) + ", " + formatDateDMY(selectedDateISO) +
    (selectedDateISO === todayISO() ? " (heute)" : "");

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
    onDrop: (shift, room, staffId) => addStaffToDailyCell(selectedDateISO, weekdayKey, shift, room, staffId),
    onRemove: (shift, room, staffId) => removeStaffFromDailyCell(selectedDateISO, weekdayKey, shift, room, staffId)
  });

  const activeIds = Object.keys(staffMap).filter(id => staffMap[id].aktiv !== false);
  renderStaffSidebar(document.getElementById("sidebar"), activeIds, staffMap, workingHoursMap, weekdayKey, cells);
}

function renderDateNav() {
  const el = document.getElementById("date-nav");
  if (!el) return;
  const isToday = selectedDateISO === todayISO();
  let quickDays = "";
  for (let i = 0; i < 5; i++) {
    const iso = addDaysToISO(todayISO(), i);
    const wd = weekdayKeyForDate(iso);
    if (!wd) continue; // Wochenende überspringen
    const label = i === 0 ? "Heute" : weekdayLabel(wd).slice(0, 2);
    quickDays += `<button type="button" class="${iso === selectedDateISO ? "active" : ""}" onclick="setSelectedDate('${iso}')">${label}</button>`;
  }
  el.innerHTML = `
    <div class="tabs">${quickDays}</div>
    <div class="date-picker">
      <button type="button" class="btn small secondary" onclick="shiftSelectedDate(-1)">&larr;</button>
      <input type="date" value="${selectedDateISO}" onchange="onDatePicked(this.value)">
      <button type="button" class="btn small secondary" onclick="shiftSelectedDate(1)">&rarr;</button>
      ${!isToday ? `<button type="button" class="btn small secondary" onclick="goToToday()">Heute</button>` : ""}
    </div>
  `;
}

// Freitext-Notiz für den gewählten Tag (z.B. "Ausflug Sonnengruppe"), für alle
// sichtbar. Überschreibt das Feld nicht während man gerade selbst hineintippt.
function renderDailyNote() {
  const el = document.getElementById("daily-note");
  if (!el) return;
  if (document.activeElement === el) return;
  el.value = dailyOverride.notiz || "";
}

function onDailyNoteChange(value) {
  setDailyNote(selectedDateISO, value.trim());
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
  setGartenModus(selectedDateISO, enabled);
}

function renderPickupEditor(slots) {
  const el = document.getElementById("pickup-editor");
  if (!el) return;
  const resetBtn = slots.isOverridden
    ? `<button type="button" class="btn small secondary" onclick="resetDailyPickup()">Zurücksetzen auf Wochenplan-Standard</button>`
    : "";
  el.innerHTML = `
    <strong>Abholung 12:20:</strong>
    <select onchange="onDailyPickupChange('p1', this.value)">${renderStaffSelectOptions(staffMap, slots.p1)}</select>
    <select onchange="onDailyPickupChange('p2', this.value)">${renderStaffSelectOptions(staffMap, slots.p2)}</select>
    ${resetBtn}
  `;
}

function onDailyPickupChange(slot, staffId) {
  const current = effectivePickupSlots();
  const updated = { p1: current.p1, p2: current.p2 };
  updated[slot] = staffId;
  setDailyPickup(selectedDateISO, updated);
}

function resetDailyPickup() {
  clearDailyPickupOverride(selectedDateISO);
}
