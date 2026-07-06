// Gemeinsame Raum-Grid- und Drag&Drop-Komponente.
// Wird sowohl von der Tagesübersicht (index.js) als auch von der
// Wochenplanung (week.js) genutzt – nur die Datenquelle (weeklyTemplate
// vs. dailyOverrides) und die onDrop/onRemove-Callbacks unterscheiden sich.
//
// Zwei Bedienwege, die parallel funktionieren:
// 1) Maus-Drag&Drop (Desktop) – native HTML5-DnD-Attribute.
// 2) Antippen (Tablet/Touch, wo natives HTML5-DnD nicht funktioniert):
//    erst eine Person antippen ("ausgewählt"), danach den Zielbereich
//    antippen. Funktioniert genauso gut mit der Maus (Klick statt Drag).

let _dragData = null; // { staffId, fromShift, fromRoom }
let currentHandlers = null;
let selectedItem = null; // { staffId, fromShift, fromRoom } – fromShift/fromRoom "" = aus der Seitenleiste

let _gridArgs = null; // { container, opts }
let _sidebarArgs = null; // { container, staffIds, staffMap, workingHoursMap, weekdayKey }

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

function isSelected(staffId, shiftKey, roomKey) {
  return !!selectedItem &&
    selectedItem.staffId === staffId &&
    selectedItem.fromShift === shiftKey &&
    selectedItem.fromRoom === roomKey;
}

// opts = {
//   weekdayKey, cells: {shiftKey: {roomKey: [staffId,...]}}, staffMap,
//   workingHoursMap, editable,
//   onDrop(shiftKey, roomKey, staffId), onRemove(shiftKey, roomKey, staffId)
// }
function renderRoomGrid(container, opts) {
  _gridArgs = { container, opts };
  currentHandlers = opts;
  const cells = opts.cells || {};
  const staffMap = opts.staffMap || {};
  const workingHoursMap = opts.workingHoursMap || {};
  const weekdayKey = opts.weekdayKey;
  const editable = opts.editable !== false;

  let html = "";
  if (editable && selectedItem) {
    const s = staffMap[selectedItem.staffId];
    html += `<div class="selection-hint">${escapeHtml(s ? s.name : "Person")} ausgewählt – Zielbereich antippen.
      <button type="button" class="btn small secondary" onclick="cancelSelection()">Abbrechen</button></div>`;
  }

  html += '<div class="room-grid">';
  SHIFTS.forEach(shift => {
    html += `<div class="shift-block"><h3>${shift.label}</h3><div class="room-rows">`;
    ROOMS.forEach(room => {
      const ids = (cells[shift.key] && cells[shift.key][room.key]) || [];
      const understaffed = room.checkMin && ids.length > 0 && ids.length < MIN_PER_ROOM;
      const canDrop = editable && !!selectedItem;
      html += `<div class="room-row ${understaffed ? "understaffed" : ""} ${canDrop ? "can-drop" : ""}"
                    onclick="roomRowClick('${shift.key}', '${room.key}')"
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
        const selected = isSelected(id, shift.key, room.key);
        html += renderChip(id, s, shift.key, room.key, conflict, editable, selected);
      });
      html += "</div></div>";
    });
    html += "</div></div>";
  });
  html += "</div>";
  container.innerHTML = html;
}

function renderChip(id, staff, shiftKey, roomKey, conflict, editable, selected) {
  const classes = ["chip"];
  if (conflict) classes.push("chip-conflict");
  if (selected) classes.push("selected");
  const clickAttr = editable ? `onclick="chipClick(event, '${id}', '${shiftKey}', '${roomKey}')"` : "";
  const dragAttrs = editable
    ? `draggable="true" ondragstart="roomGridDragStart(event, '${id}', '${shiftKey}', '${roomKey}')"`
    : "";
  const removeBtn = editable
    ? `<button type="button" class="chip-remove" title="Entfernen" onclick="event.stopPropagation(); roomGridRemoveClick('${shiftKey}','${roomKey}','${id}')"><i class="fa-solid fa-xmark"></i></button>`
    : "";
  const title = conflict
    ? ` title="${escAttr("Laut Arbeitszeit an diesem Tag/in dieser Schicht eigentlich nicht da")}"`
    : "";
  return `<span class="${classes.join(" ")}" ${clickAttr} ${dragAttrs}${title}>${escapeHtml(staff.name)}${removeBtn}</span>`;
}

// Seitenleiste mit allen verfügbaren Personen zum Reinziehen/Antippen. Personen, die laut
// Arbeitszeit an diesem Tag frei haben, werden nur optisch markiert, nicht gesperrt.
function renderStaffSidebar(container, staffIds, staffMap, workingHoursMap, weekdayKey) {
  _sidebarArgs = { container, staffIds, staffMap, workingHoursMap, weekdayKey };

  let html = '<div class="staff-sidebar" onclick="sidebarAreaClick()" ondragover="roomGridAllowDrop(event)" ondrop="roomGridDropToSidebar(event)">';
  html += '<h4>Verfügbares Personal</h4><p class="hint">Antippen zum Auswählen, dann Zielbereich antippen. Auf freie Stelle hier tippen entfernt jemanden aus der Einteilung.</p>';
  staffIds.forEach(id => {
    const s = staffMap[id];
    if (!s) return;
    const hours = (workingHoursMap[id] || {})[weekdayKey];
    const frei = !!weekdayKey && (!hours || hours.frei);
    const timeLabel = hours && !hours.frei ? `${hours.start}–${hours.end}` : "frei / nicht eingetragen";
    const selected = isSelected(id, "", "");
    html += `<span class="chip chip-source ${frei ? "chip-conflict" : ""} ${selected ? "selected" : ""}" draggable="true"
                onclick="chipClick(event, '${id}', '', '')"
                ondragstart="roomGridDragStart(event, '${id}', '', '')"
                title="${escAttr(timeLabel)}">${escapeHtml(s.name)}</span>`;
  });
  html += "</div>";
  container.innerHTML = html;
}

function refreshUI() {
  if (_gridArgs) renderRoomGrid(_gridArgs.container, _gridArgs.opts);
  if (_sidebarArgs) {
    const a = _sidebarArgs;
    renderStaffSidebar(a.container, a.staffIds, a.staffMap, a.workingHoursMap, a.weekdayKey);
  }
}

function chipClick(ev, staffId, fromShift, fromRoom) {
  if (ev) ev.stopPropagation();
  if (isSelected(staffId, fromShift, fromRoom)) {
    selectedItem = null;
  } else {
    selectedItem = { staffId, fromShift, fromRoom };
  }
  refreshUI();
}

function cancelSelection() {
  selectedItem = null;
  refreshUI();
}

function roomRowClick(toShift, toRoom) {
  if (!selectedItem || !currentHandlers) return;
  const { staffId, fromShift, fromRoom } = selectedItem;
  selectedItem = null;
  if (fromShift === toShift && fromRoom === toRoom) { refreshUI(); return; }
  if (fromShift && fromRoom && currentHandlers.onRemove) currentHandlers.onRemove(fromShift, fromRoom, staffId);
  if (currentHandlers.onDrop) currentHandlers.onDrop(toShift, toRoom, staffId);
  refreshUI();
}

function sidebarAreaClick() {
  if (!selectedItem) return;
  const { staffId, fromShift, fromRoom } = selectedItem;
  selectedItem = null;
  if (fromShift && fromRoom && currentHandlers && currentHandlers.onRemove) currentHandlers.onRemove(fromShift, fromRoom, staffId);
  refreshUI();
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
  ev.stopPropagation();
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
