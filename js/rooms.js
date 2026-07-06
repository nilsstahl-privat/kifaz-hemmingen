// Gemeinsame Raum-Grid- und Drag&Drop-Komponente.
// Wird sowohl von der Tagesübersicht (index.js) als auch von der
// Wochenplanung (week.js) genutzt – nur die Datenquelle (weeklyTemplate
// vs. dailyOverrides) und die onDrop/onRemove-Callbacks unterscheiden sich.

let _dragData = null; // { staffId, fromShift, fromRoom }
let currentHandlers = null;

function hhmmToMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Grobe Prüfung: arbeitet die Person laut ihren Arbeitszeiten überhaupt
// während des Zeitfensters dieser Schicht? Wird nur für eine Warnung genutzt,
// blockiert das Zuordnen aber nicht.
function isWorkingDuringShift(hours, shiftKey) {
  if (!hours || hours.frei || !hours.start || !hours.end) return false;
  const [winStart, winEnd] = SHIFT_WINDOWS[shiftKey];
  return hhmmToMin(hours.start) < winEnd && hhmmToMin(hours.end) > winStart;
}

// opts = {
//   weekdayKey, cells: {shiftKey: {roomKey: [staffId,...]}}, staffMap,
//   workingHoursMap, editable,
//   onDrop(shiftKey, roomKey, staffId), onRemove(shiftKey, roomKey, staffId)
// }
function renderRoomGrid(container, opts) {
  currentHandlers = opts;
  const cells = opts.cells || {};
  const staffMap = opts.staffMap || {};
  const workingHoursMap = opts.workingHoursMap || {};
  const weekdayKey = opts.weekdayKey;
  const editable = opts.editable !== false;

  let html = '<div class="room-grid">';
  SHIFTS.forEach(shift => {
    html += `<div class="shift-block"><h3>${shift.label}</h3><div class="room-rows">`;
    ROOMS.forEach(room => {
      const ids = (cells[shift.key] && cells[shift.key][room.key]) || [];
      const understaffed = room.checkMin && ids.length > 0 && ids.length < MIN_PER_ROOM;
      html += `<div class="room-row ${understaffed ? "understaffed" : ""}"
                    ondragover="roomGridAllowDrop(event)"
                    ondrop="roomGridDrop(event, '${shift.key}', '${room.key}')">
                 <div class="room-row-label">${room.label}${
                   understaffed ? ' <span class="warn">⚠ unterbesetzt</span>' : ""
                 }</div>
                 <div class="room-row-chips">`;
      ids.forEach(id => {
        const s = staffMap[id];
        if (!s) return;
        const hours = (workingHoursMap[id] || {})[weekdayKey];
        const conflict = !!weekdayKey && !isWorkingDuringShift(hours, shift.key);
        html += renderChip(id, s, shift.key, room.key, conflict, editable);
      });
      html += "</div></div>";
    });
    html += "</div></div>";
  });
  html += "</div>";
  container.innerHTML = html;
}

function renderChip(id, staff, shiftKey, roomKey, conflict, editable) {
  const classes = ["chip"];
  if (conflict) classes.push("chip-conflict");
  const dragAttrs = editable
    ? `draggable="true" ondragstart="roomGridDragStart(event, '${id}', '${shiftKey}', '${roomKey}')"`
    : "";
  const removeBtn = editable
    ? `<button type="button" class="chip-remove" title="Entfernen" onclick="roomGridRemoveClick('${shiftKey}','${roomKey}','${id}')"><i class="fa-solid fa-xmark"></i></button>`
    : "";
  const title = conflict
    ? ` title="${escAttr("Laut Arbeitszeit an diesem Tag/in dieser Schicht eigentlich nicht da")}"`
    : "";
  return `<span class="${classes.join(" ")}" ${dragAttrs}${title}>${escapeHtml(staff.name)}${removeBtn}</span>`;
}

// Seitenleiste mit allen verfügbaren Personen zum Reinziehen. Personen, die laut
// Arbeitszeit an diesem Tag frei haben, werden nur optisch markiert, nicht gesperrt.
function renderStaffSidebar(container, staffIds, staffMap, workingHoursMap, weekdayKey) {
  let html = '<div class="staff-sidebar" ondragover="roomGridAllowDrop(event)" ondrop="roomGridDropToSidebar(event)">';
  html += "<h4>Verfügbares Personal</h4><p class=\"hint\">Hierher ziehen entfernt jemanden aus der Einteilung.</p>";
  staffIds.forEach(id => {
    const s = staffMap[id];
    if (!s) return;
    const hours = (workingHoursMap[id] || {})[weekdayKey];
    const frei = !!weekdayKey && (!hours || hours.frei);
    const timeLabel = hours && !hours.frei ? `${hours.start}–${hours.end}` : "frei / nicht eingetragen";
    html += `<span class="chip chip-source ${frei ? "chip-conflict" : ""}" draggable="true"
                ondragstart="roomGridDragStart(event, '${id}', '', '')"
                title="${escAttr(timeLabel)}">${escapeHtml(s.name)}</span>`;
  });
  html += "</div>";
  container.innerHTML = html;
}

function roomGridDragStart(ev, staffId, fromShift, fromRoom) {
  _dragData = { staffId, fromShift, fromRoom };
  ev.dataTransfer.effectAllowed = "move";
  ev.dataTransfer.setData("text/plain", staffId);
}

function roomGridAllowDrop(ev) {
  ev.preventDefault();
}

function roomGridDrop(ev, toShift, toRoom) {
  ev.preventDefault();
  if (!_dragData || !currentHandlers) return;
  const { staffId, fromShift, fromRoom } = _dragData;
  _dragData = null;
  if (fromShift === toShift && fromRoom === toRoom) return;
  if (fromShift && fromRoom && currentHandlers.onRemove) currentHandlers.onRemove(fromShift, fromRoom, staffId);
  if (currentHandlers.onDrop) currentHandlers.onDrop(toShift, toRoom, staffId);
}

function roomGridDropToSidebar(ev) {
  ev.preventDefault();
  if (!_dragData || !currentHandlers) return;
  const { staffId, fromShift, fromRoom } = _dragData;
  _dragData = null;
  if (fromShift && fromRoom && currentHandlers.onRemove) currentHandlers.onRemove(fromShift, fromRoom, staffId);
}

function roomGridRemoveClick(shiftKey, roomKey, staffId) {
  if (currentHandlers && currentHandlers.onRemove) currentHandlers.onRemove(shiftKey, roomKey, staffId);
}
