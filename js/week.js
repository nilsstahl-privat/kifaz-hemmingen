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

  renderRoomGrid(document.getElementById("room-grid"), {
    weekdayKey: selectedDay,
    cells,
    staffMap,
    workingHoursMap,
    editable: true,
    onDrop: (shift, room, staffId) => addStaffToCell("weeklyTemplate/" + selectedDay, shift, room, staffId),
    onRemove: (shift, room, staffId) => removeStaffFromCell("weeklyTemplate/" + selectedDay, shift, room, staffId)
  });

  const activeIds = Object.keys(staffMap).filter(id => staffMap[id].aktiv !== false);
  renderStaffSidebar(document.getElementById("sidebar"), activeIds, staffMap, workingHoursMap, selectedDay, cells);
}
