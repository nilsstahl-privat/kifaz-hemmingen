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

// Ist die Person während dieser Schicht da, geht aber vor Schichtende? Dann
// zeigen wir "bis HH:MM" am Namen an, statt sie nur pauschal als Konflikt zu markieren.
function earlyLeaveTime(hours, shiftKey) {
  if (!hours || hours.frei || !hours.start || !hours.end) return null;
  const [winStart, winEnd] = SHIFT_WINDOWS[shiftKey];
  const start = hhmmToMin(hours.start);
  const end = hhmmToMin(hours.end);
  if (start < winEnd && end > winStart && end < winEnd) return hours.end;
  return null;
}

function isSelected(staffId, shiftKey, roomKey) {
  return !!selectedItem &&
    selectedItem.staffId === staffId &&
    selectedItem.fromShift === shiftKey &&
    selectedItem.fromRoom === roomKey;
}

// Wer kommt für die Regelkinder-Abholung um 12:20 infrage? Nur Personen, die
// entweder bis spätestens 12:30 gehen oder in einem Raum mit schon 3+ Leuten
// stehen (dort fällt das kurze Fehlen nicht unter die Mindestbesetzung).
function isPickupEligible(hours, roomCount) {
  if (roomCount >= 3) return true;
  if (hours && !hours.frei && hours.end && hhmmToMin(hours.end) <= hhmmToMin("12:30")) return true;
  return false;
}

// Garten-Modus (nur Tagesübersicht): fasst alle Nicht-Küche-Räume dieser Schicht
// zu einer Liste zusammen. Jeder Eintrag merkt sich seinen tatsächlichen Raum
// (actualRoom), damit Entfernen/Verschieben weiterhin die richtige Zelle trifft.
function gartenEntriesFor(cells, shiftKey, roomKey) {
  if (roomKey !== "garten") {
    return ((cells[shiftKey] && cells[shiftKey][roomKey]) || []).map(id => ({ id, actualRoom: roomKey }));
  }
  const entries = [];
  const seen = {};
  ROOMS.forEach(r => {
    if (r.key === "kueche") return;
    ((cells[shiftKey] && cells[shiftKey][r.key]) || []).forEach(id => {
      if (!seen[id]) { seen[id] = true; entries.push({ id, actualRoom: r.key }); }
    });
  });
  ((cells[shiftKey] && cells[shiftKey].garten) || []).forEach(id => {
    if (!seen[id]) { seen[id] = true; entries.push({ id, actualRoom: "garten" }); }
  });
  return entries;
}

// opts = {
//   weekdayKey, cells: {shiftKey: {roomKey: [staffId,...]}}, staffMap,
//   workingHoursMap, editable, gartenModus (nur Tagesübersicht),
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
  const gartenModus = !!opts.gartenModus;

  let html = "";
  if (editable && selectedItem) {
    const s = staffMap[selectedItem.staffId];
    html += `<div class="selection-hint">${escapeHtml(s ? s.name : "Person")} ausgewählt – Zielbereich antippen.
      <button type="button" class="btn small secondary" onclick="cancelSelection()">Abbrechen</button></div>`;
  }

  const roomList = gartenModus
    ? [ROOMS.find(r => r.key === "kueche"), { key: "garten", label: "Garten", checkMin: false }]
    : ROOMS;

  html += '<div class="room-grid">';
  roomList.forEach(room => {
    html += `<div class="room-block"><div class="room-block-header">${room.label}</div><div class="room-block-shifts">`;
    SHIFTS.forEach(shift => {
      const entries = gartenModus
        ? gartenEntriesFor(cells, shift.key, room.key)
        : (((cells[shift.key] && cells[shift.key][room.key]) || []).map(id => ({ id, actualRoom: room.key })));
      const understaffed = room.checkMin && entries.length > 0 && entries.length < MIN_PER_ROOM;
      const canDrop = editable && !!selectedItem;
      html += `<div class="shift-col ${understaffed ? "understaffed" : ""} ${canDrop ? "can-drop" : ""}"
                    onclick="roomRowClick('${shift.key}', '${room.key}')"
                    ondragover="roomGridAllowDrop(event)"
                    ondrop="roomGridDrop(event, '${shift.key}', '${room.key}')">
                 <div class="shift-col-label">${shift.label}${
                   understaffed ? ' <span class="warn">⚠ unterbesetzt</span>' : ""
                 }</div>
                 <div class="shift-col-chips">`;
      entries.forEach(({ id, actualRoom }) => {
        const s = staffMap[id];
        if (!s) return;
        const hours = (workingHoursMap[id] || {})[weekdayKey];
        const conflict = !!weekdayKey && !isWorkingDuringShift(hours, shift.key);
        const leavesAt = weekdayKey ? earlyLeaveTime(hours, shift.key) : null;
        const selected = isSelected(id, shift.key, actualRoom);
        let pickup = null;
        if (opts.pickup && shift.key === "a") {
          const isPickupPerson = opts.pickup.personId === id;
          const eligible = isPickupEligible(hours, entries.length);
          if (isPickupPerson || eligible) pickup = { active: isPickupPerson };
        }
        html += renderChip(id, s, shift.key, actualRoom, conflict, editable, selected, leavesAt, pickup);
      });
      html += "</div></div>";
    });
    html += "</div></div>";
  });
  html += "</div>";
  container.innerHTML = html;
}

function renderChip(id, staff, shiftKey, roomKey, conflict, editable, selected, leavesAt, pickup) {
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
  const pickupBtn = pickup
    ? `<button type="button" class="chip-pickup ${pickup.active ? "active" : ""}" title="${escAttr(
        "Holt um 12:20 die Heimgehkinder ab (ab ca. 12:35 wieder einsetzbar)"
      )}" onclick="event.stopPropagation(); roomGridTogglePickup('${id}')"><i class="fa-solid fa-house"></i></button>`
    : "";
  const title = conflict
    ? ` title="${escAttr("Laut Arbeitszeit an diesem Tag/in dieser Schicht eigentlich nicht da")}"`
    : "";
  const leaveLabel = leavesAt ? `<span class="chip-leaves">bis ${escapeHtml(leavesAt)}</span>` : "";
  return `<span class="${classes.join(" ")}" ${clickAttr} ${dragAttrs}${title}>${escapeHtml(staff.name)}${leaveLabel}${pickupBtn}${removeBtn}</span>`;
}

// Gibt es noch eine Schicht, in der diese Person laut Arbeitszeiten überhaupt
// arbeiten könnte UND noch nicht eingeteilt ist? Nur dann gilt sie als "noch
// offen". Jemand, der z.B. nur bis 13:00 arbeitet, kann nie in Schicht b landen
// und gilt direkt nach der Zuteilung in Schicht a als fertig eingeteilt – auch
// wenn er "erst" in einer von zwei Schichten steht.
function hasOpenCapacity(cells, hours, staffId) {
  if (!cells) return true;
  return SHIFTS.some(shift => {
    const shiftCells = cells[shift.key] || {};
    const alreadyIn = Object.keys(shiftCells).some(roomKey => (shiftCells[roomKey] || []).includes(staffId));
    if (alreadyIn) return false;
    return isWorkingDuringShift(hours, shift.key);
  });
}

// Seitenleiste mit allen Personen zum Reinziehen/Antippen, aufgeteilt danach, ob sie laut
// Arbeitszeitplan an diesem Tag überhaupt verfügbar sind. "Nicht da" sperrt das Zuordnen
// nicht (z.B. spontane Vertretung), macht aber sichtbar, wer eigentlich frei hat. Zusätzlich:
// wer laut Arbeitszeit keine weitere Schicht mehr arbeiten könnte (z.B. schon eingeteilt,
// oder geht vor Schichtbeginn/-ende) wird ausgegraut, wer noch eine mögliche freie
// Schicht hat, wird farblich hervorgehoben.
function renderStaffSidebar(container, staffIds, staffMap, workingHoursMap, weekdayKey, cells) {
  _sidebarArgs = { container, staffIds, staffMap, workingHoursMap, weekdayKey, cells };

  function isAvailable(id) {
    const hours = (workingHoursMap[id] || {})[weekdayKey];
    return !(!!weekdayKey && (!hours || hours.frei));
  }

  function chipHtml(id) {
    const s = staffMap[id];
    const hours = (workingHoursMap[id] || {})[weekdayKey];
    const frei = !isAvailable(id);
    const timeLabel = hours && !hours.frei ? `${hours.start}–${hours.end}` : "frei / nicht eingetragen";
    const selected = isSelected(id, "", "");
    const classes = ["chip", "chip-source"];
    if (frei) classes.push("chip-conflict");
    if (selected) classes.push("selected");
    classes.push(hasOpenCapacity(cells, hours, id) ? "chip-open" : "chip-placed");
    return `<span class="${classes.join(" ")}" draggable="true"
                onclick="chipClick(event, '${id}', '', '')"
                ondragstart="roomGridDragStart(event, '${id}', '', '')"
                title="${escAttr(timeLabel)}">${escapeHtml(s.name)}</span>`;
  }

  let html = '<div class="staff-sidebar" onclick="sidebarAreaClick()" ondragover="roomGridAllowDrop(event)" ondrop="roomGridDropToSidebar(event)">';
  html += '<h4>Verfügbares Personal</h4><p class="hint">Antippen zum Auswählen, dann Zielbereich antippen. Auf freie Stelle hier tippen entfernt jemanden aus der Einteilung. Ausgegraut = laut Arbeitszeit keine weitere Schicht mehr möglich.</p>';

  if (weekdayKey) {
    const ids = staffIds.filter(id => staffMap[id]);
    const available = ids.filter(isAvailable);
    const unavailable = ids.filter(id => !isAvailable(id));
    html += `<div class="sidebar-group-label">Verfügbar heute (${available.length})</div>`;
    html += available.map(chipHtml).join("") || '<p class="hint">Niemand laut Plan verfügbar.</p>';
    html += `<div class="sidebar-group-label">Laut Plan nicht da (${unavailable.length})</div>`;
    html += unavailable.map(chipHtml).join("") || '<p class="hint">Alle verfügbar.</p>';
  } else {
    html += staffIds.filter(id => staffMap[id]).map(chipHtml).join("");
  }

  html += "</div>";
  container.innerHTML = html;
}

function refreshUI() {
  if (_gridArgs) renderRoomGrid(_gridArgs.container, _gridArgs.opts);
  if (_sidebarArgs) {
    const a = _sidebarArgs;
    renderStaffSidebar(a.container, a.staffIds, a.staffMap, a.workingHoursMap, a.weekdayKey, a.cells);
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

function roomGridTogglePickup(staffId) {
  if (currentHandlers && currentHandlers.onTogglePickup) currentHandlers.onTogglePickup(staffId);
}
