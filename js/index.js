// Seiten-Logik für die Tagesübersicht.

let staffMap = {};
let workingHoursMap = {};
let weeklyTemplate = {};
let dailyOverride = {};
let editMode = false;

const weekdayKey = todayWeekdayKey();
const dateISO = todayISO();

document.addEventListener("DOMContentLoaded", init);

function init() {
  if (USING_FAKE_DB) document.getElementById("fake-db-banner").style.display = "";

  const title = document.getElementById("day-title");
  if (!weekdayKey) {
    title.textContent = "Heute (" + dateISO + ") – am Wochenende gibt es keinen Mittagsplan";
    document.getElementById("day-content").style.display = "none";
    document.querySelector('main > .card:nth-of-type(1) button').style.display = "none";
    return;
  }
  title.textContent = weekdayLabel(weekdayKey) + ", " + dateISO;

  seedIfEmpty();
  watchStaff(data => { staffMap = data; renderAll(); });
  watchWorkingHours(data => { workingHoursMap = data; renderAll(); });
  watchWeeklyTemplate(data => { weeklyTemplate = data; renderAll(); });
  watchDailyOverride(dateISO, data => { dailyOverride = data; renderAll(); });

  document.getElementById("edit-toggle").addEventListener("click", toggleEdit);
}

function toggleEdit() {
  if (!editMode) {
    ensureDailyAssignmentsInitialized(weekdayKey, dateISO).then(() => {
      editMode = true;
      renderAll();
    });
  } else {
    editMode = false;
    renderAll();
  }
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
    absences: dailyOverride.absences || {},
    editable: editMode,
    onDrop: (shift, room, staffId) =>
      addStaffToCell("dailyOverrides/" + dateISO + "/assignments", shift, room, staffId),
    onRemove: (shift, room, staffId) =>
      removeStaffFromCell("dailyOverrides/" + dateISO + "/assignments", shift, room, staffId)
  });

  const sidebarWrap = document.getElementById("sidebar-wrap");
  if (editMode) {
    const activeIds = Object.keys(staffMap).filter(id => staffMap[id].aktiv !== false);
    renderStaffSidebar(document.getElementById("sidebar"), activeIds, staffMap, workingHoursMap, weekdayKey);
    sidebarWrap.style.display = "";
  } else {
    sidebarWrap.style.display = "none";
  }

  document.getElementById("edit-toggle").textContent = editMode ? "Fertig" : "Bearbeiten (heutige Ausnahme)";

  renderAbsencePanel();
}

function renderAbsencePanel() {
  const cells = mergedCells();
  const idsToday = new Set();
  Object.values(cells).forEach(shiftObj => {
    Object.values(shiftObj).forEach(arr => arr.forEach(id => idsToday.add(id)));
  });
  const absences = dailyOverride.absences || {};

  const sortedIds = Array.from(idsToday)
    .filter(id => staffMap[id])
    .sort((a, b) => staffMap[a].name.localeCompare(staffMap[b].name));

  if (sortedIds.length === 0) {
    document.getElementById("absence-panel").innerHTML = '<p class="muted">Niemand eingeteilt.</p>';
    return;
  }

  let html = "";
  sortedIds.forEach(id => {
    const s = staffMap[id];
    const status = absences[id];
    html += `<div class="form-row">
      <strong>${escapeHtml(s.name)}</strong>
      <button type="button" class="btn small ${status === "krank" ? "" : "secondary"}" onclick="markAbsence('${id}','krank')">Krank</button>
      <button type="button" class="btn small ${status === "verhindert" ? "" : "secondary"}" onclick="markAbsence('${id}','verhindert')">Verhindert</button>
      ${status ? `<button type="button" class="btn small secondary" onclick="markAbsence('${id}', null)">Zurücksetzen</button>` : ""}
    </div>`;
  });
  document.getElementById("absence-panel").innerHTML = html;
}

function markAbsence(staffId, status) {
  setAbsence(dateISO, staffId, status);
}
