// Seiten-Logik für die Wochenübersicht/-planung (dauerhafter Wochenplan).

let staffMap = {};
let workingHoursMap = {};
let weeklyTemplate = {};
let selectedDay = todayWeekdayKey() || "mo";

document.addEventListener("DOMContentLoaded", init);

function init() {
  if (USING_FAKE_DB) document.getElementById("fake-db-banner").style.display = "";

  seedIfEmpty();
  renderTabs();

  watchStaff(data => { staffMap = data; renderAll(); });
  watchWorkingHours(data => { workingHoursMap = data; renderAll(); });
  watchWeeklyTemplate(data => { weeklyTemplate = data; renderAll(); });
}

function renderTabs() {
  let html = "";
  WEEKDAYS.forEach(w => {
    html += `<button type="button" class="${w.key === selectedDay ? "active" : ""}" onclick="selectDay('${w.key}')">${w.label}</button>`;
  });
  document.getElementById("tabs").innerHTML = html;
}

function selectDay(key) {
  selectedDay = key;
  renderTabs();
  renderAll();
}

function renderAll() {
  const cells = weeklyTemplate[selectedDay] || {};
  const pickup = cells.pickup || {};

  renderPickupEditor(pickup);

  renderRoomGrid(document.getElementById("room-grid"), {
    weekdayKey: selectedDay,
    cells,
    staffMap,
    workingHoursMap,
    editable: true,
    pickup: { activeIds: [pickup.p1, pickup.p2].filter(Boolean) },
    onDrop: (shift, room, staffId) => addStaffToCell("weeklyTemplate/" + selectedDay, shift, room, staffId),
    onRemove: (shift, room, staffId) => removeStaffFromCell("weeklyTemplate/" + selectedDay, shift, room, staffId)
  });

  const activeIds = Object.keys(staffMap).filter(id => staffMap[id].aktiv !== false);
  renderStaffSidebar(document.getElementById("sidebar"), activeIds, staffMap, workingHoursMap, selectedDay, cells);
}

function renderPickupEditor(pickup) {
  const el = document.getElementById("pickup-editor");
  if (!el) return;
  el.innerHTML = `
    <strong>Abholung 12:20 (Standard für ${escapeHtml(weekdayLabel(selectedDay))}):</strong>
    <select onchange="onWeeklyPickupChange('p1', this.value)">${renderStaffSelectOptions(staffMap, pickup.p1)}</select>
    <select onchange="onWeeklyPickupChange('p2', this.value)">${renderStaffSelectOptions(staffMap, pickup.p2)}</select>
  `;
}

function onWeeklyPickupChange(slot, staffId) {
  setWeeklyPickupSlot(selectedDay, slot, staffId);
}
