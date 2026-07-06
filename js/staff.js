// Seiten-Logik für Personal &amp; Arbeitszeiten.

let staffMap = {};
let workingHoursMap = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  if (USING_FAKE_DB) document.getElementById("fake-db-banner").style.display = "";

  seedIfEmpty();
  populateGroupSelect(document.getElementById("new-gruppe"));

  watchStaff(data => { staffMap = data; renderStaffTable(); });
  watchWorkingHours(data => { workingHoursMap = data; renderStaffTable(); });

  document.getElementById("add-staff-form").addEventListener("submit", onAddStaffSubmit);
}

function populateGroupSelect(selectEl) {
  selectEl.innerHTML = GRUPPEN.map(g => `<option value="${escAttr(g.key)}">${escapeHtml(g.label)}</option>`).join("");
}

function onAddStaffSubmit(ev) {
  ev.preventDefault();
  const name = document.getElementById("new-name").value.trim();
  if (!name) return;
  addStaff({
    name,
    gruppe: document.getElementById("new-gruppe").value,
    notiz: document.getElementById("new-notiz").value.trim(),
    aktiv: document.getElementById("new-aktiv").checked
  });
  ev.target.reset();
  document.getElementById("new-aktiv").checked = true;
}

function renderStaffTable() {
  const ids = Object.keys(staffMap).sort((a, b) => staffMap[a].name.localeCompare(staffMap[b].name));
  let html = '<table class="staff-table hours-table"><thead><tr><th>Name</th><th>Gruppe</th><th>Notiz</th><th>Aktiv</th>';
  WEEKDAYS.forEach(w => { html += `<th>${escapeHtml(w.label)}</th>`; });
  html += "<th></th></tr></thead><tbody>";

  ids.forEach(id => {
    const s = staffMap[id];
    html += `<tr>
      <td><input type="text" value="${escAttr(s.name)}" onchange="onStaffFieldChange('${id}','name',this.value)"></td>
      <td>${renderGroupSelectCell(id, s.gruppe)}</td>
      <td><input type="text" value="${escAttr(s.notiz || "")}" onchange="onStaffFieldChange('${id}','notiz',this.value)"></td>
      <td><input type="checkbox" ${s.aktiv !== false ? "checked" : ""} onchange="onStaffFieldChange('${id}','aktiv',this.checked)"></td>`;

    WEEKDAYS.forEach(w => {
      const h = (workingHoursMap[id] && workingHoursMap[id][w.key]) || { start: "", end: "", frei: true };
      html += `<td>
        <label class="muted" style="display:flex;gap:4px;align-items:center;white-space:nowrap;">
          <input type="checkbox" ${h.frei ? "checked" : ""} onchange="onHoursChange('${id}','${w.key}','frei',this.checked)"> frei
        </label>
        <input type="time" value="${escAttr(h.start || "")}" ${h.frei ? "disabled" : ""} onchange="onHoursChange('${id}','${w.key}','start',this.value)">
        <input type="time" value="${escAttr(h.end || "")}" ${h.frei ? "disabled" : ""} onchange="onHoursChange('${id}','${w.key}','end',this.value)">
      </td>`;
    });

    html += `<td><button type="button" class="btn danger small" onclick="onDeleteStaff('${id}')"><i class="fa-solid fa-trash"></i> Löschen</button></td></tr>`;
  });

  html += "</tbody></table>";
  document.getElementById("staff-table-wrap").innerHTML = html;
}

function renderGroupSelectCell(id, current) {
  const options = GRUPPEN.map(
    g => `<option value="${escAttr(g.key)}" ${g.key === (current || "") ? "selected" : ""}>${escapeHtml(g.label)}</option>`
  ).join("");
  return `<select onchange="onStaffFieldChange('${id}','gruppe',this.value)">${options}</select>`;
}

function onStaffFieldChange(id, field, value) {
  updateStaff(id, { [field]: value });
}

function onHoursChange(staffId, dayKey, field, value) {
  const current = (workingHoursMap[staffId] && workingHoursMap[staffId][dayKey]) || { start: "", end: "", frei: true };
  const updated = Object.assign({}, current, { [field]: value });
  setWorkingHours(staffId, dayKey, updated);
}

function onDeleteStaff(id) {
  const s = staffMap[id];
  if (!s) return;
  const ok = confirm(
    `"${s.name}" wirklich endgültig löschen?\nDas entfernt die Person auch aus dem Wochenplan und allen Tages-Ausnahmen.`
  );
  if (ok) deleteStaffEverywhere(id);
}
