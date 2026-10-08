/**
 * EduManage - students directory (index.html).
 * Server-side search and paging, table / grid views, the student drawer
 * (view, edit, delete) and CSV export.
 */

const PAGE_SIZE = 12;
const EXPORT_PAGE_SIZE = 100;
const VIEW_KEY = "edumanage.view";
const SEARCH_FIELDS = {
  name: { label: "name", placeholder: "Search by first or last name…" },
  nic: { label: "NIC", placeholder: "Search by NIC…" },
  id: { label: "ID", placeholder: "Search by student ID…" }
};

const state = {
  items: [],
  page: 0,
  totalPages: 0,
  totalItems: 0,
  loaded: false,
  error: null,
  view: readSavedView(),
  requestSeq: 0
};
const drawer = { student: null, mode: "view" };
const els = {};

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "students") initStudentsPage();
});

function initStudentsPage() {
  Object.assign(els, {
    results: $("#results"),
    pagination: $("#pagination"),
    search: $("#search-input"),
    searchClear: $("#search-clear"),
    progress: $("#progress-line"),
    exportButton: $("#export-btn"),
    drawer: $("#student-drawer"),
    drawerTitle: $("#drawer-title"),
    drawerBody: $("#drawer-body"),
    drawerFooter: $("#drawer-footer")
  });

  $(`input[name="view"][value="${state.view}"]`).checked = true;

  let debounce = null;
  els.search.addEventListener("input", () => {
    els.searchClear.hidden = !els.search.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => loadStudents(0), 250);
  });
  els.search.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.search.value) {
      event.stopPropagation();
      clearSearch();
    }
  });
  els.searchClear.addEventListener("click", clearSearch);

  document.querySelectorAll('input[name="search-field"]').forEach((radio) => radio.addEventListener("change", () => {
    els.search.placeholder = SEARCH_FIELDS[radio.value].placeholder;
    els.search.focus();
    if (els.search.value.trim()) loadStudents(0);
  }));
  document.querySelectorAll('input[name="gender"]').forEach((radio) => radio.addEventListener("change", () => loadStudents(0)));
  document.querySelectorAll('input[name="view"]').forEach((radio) => radio.addEventListener("change", () => {
    state.view = radio.value;
    try { localStorage.setItem(VIEW_KEY, state.view); } catch (error) { /* per-browser preference only */ }
    renderResults();
  }));

  els.results.addEventListener("click", onResultsClick);
  els.results.addEventListener("keydown", (event) => {
    const target = event.target.closest("[data-id]");
    if (event.key === "Enter" && target && event.target === target) openStudent(Number(target.dataset.id));
  });
  els.pagination.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled) return;
    loadStudents(Number(button.dataset.page));
    $(".panel").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.exportButton.addEventListener("click", exportCsv);
  els.drawerFooter.addEventListener("click", onDrawerAction);
  els.drawerBody.addEventListener("click", onDrawerAction);

  window.openStudent = openStudent;

  renderSkeleton();
  loadStats();
  loadStudents(0);
  handleDeepLink();
}

function readSavedView() {
  try {
    return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "table";
  } catch (error) {
    return "table";
  }
}

/** index.html?view=ID opens that student; &created=1 confirms a new registration. */
function handleDeepLink() {
  const params = new URLSearchParams(location.search);
  if (params.get("created")) toast("The student has been added to the directory.", { title: "Student registered" });
  const id = Number(params.get("view"));
  if (Number.isInteger(id) && id > 0) openStudent(id);
  if (params.toString()) history.replaceState(null, "", location.pathname);
}

/* ==========================================
   LOADING
   ========================================== */
function currentFilters() {
  return {
    field: $('input[name="search-field"]:checked').value,
    term: els.search.value.trim(),
    gender: $('input[name="gender"]:checked').value
  };
}

function toQuery({ field, term, gender }, page, size = PAGE_SIZE) {
  return { [field]: term, gender, page, size };
}

function isInvalidIdSearch({ field, term }) {
  return field === "id" && term !== "" && !/^[1-9]\d*$/.test(term);
}

async function loadStudents(page = state.page) {
  const filters = currentFilters();
  const seq = ++state.requestSeq;

  // A non-numeric ID can't match anyone: answer locally instead of asking the server
  if (isInvalidIdSearch(filters)) {
    Object.assign(state, { items: [], page: 0, totalPages: 0, totalItems: 0, loaded: true, error: null });
    setBusy(false);
    renderResults();
    return;
  }

  setBusy(true);
  try {
    const result = await apiRequest(studentListUrl(toQuery(filters, page)));
    if (seq !== state.requestSeq) return;
    // Deleting the last student on a page leaves it empty: step back a page
    if (!result.items.length && result.page > 0) {
      loadStudents(result.page - 1);
      return;
    }
    Object.assign(state, {
      items: result.items,
      page: result.page,
      totalPages: result.totalPages,
      totalItems: result.totalItems,
      loaded: true,
      error: null
    });
  } catch (error) {
    if (seq !== state.requestSeq) return;
    Object.assign(state, { items: [], totalPages: 0, totalItems: 0, loaded: true, error });
  }
  setBusy(false);
  renderResults();
}

function setBusy(busy) {
  els.progress.classList.toggle("is-active", busy);
  if (state.loaded) els.results.classList.toggle("is-loading", busy);
}

async function loadStats() {
  const count = async (gender) => (await apiRequest(studentListUrl({ gender, size: 1 }))).totalItems;
  try {
    const [total, male, female] = await Promise.all([count(""), count("M"), count("F")]);
    const share = (value) => (total ? Math.round((value / total) * 100) : 0);

    animateNumber($("#stat-total"), total);
    animateNumber($("#stat-male"), male);
    animateNumber($("#stat-female"), female);
    $("#split-male").style.width = `${total ? (male / total) * 100 : 0}%`;
    $("#split-female").style.width = `${total ? (female / total) * 100 : 0}%`;
    $("#meter-male").style.width = `${share(male)}%`;
    $("#meter-female").style.width = `${share(female)}%`;
    $("#stat-male-share").textContent = total ? `${share(male)}% of all students` : "No students yet";
    $("#stat-female-share").textContent = total ? `${share(female)}% of all students` : "No students yet";
  } catch (error) {
    console.error("Could not load stats:", error);
  }
}

function clearSearch() {
  els.search.value = "";
  els.searchClear.hidden = true;
  els.search.focus();
  loadStudents(0);
}

function clearFilters() {
  els.search.value = "";
  els.searchClear.hidden = true;
  $('input[name="gender"][value=""]').checked = true;
  loadStudents(0);
}

/* ==========================================
   RENDERING
   ========================================== */
function renderSkeleton() {
  const row = () => `
    <tr>
      <td><div class="cell-student"><span class="skeleton" style="width:32px;height:32px;border-radius:50%"></span>
        <div style="display:grid;gap:6px"><span class="skeleton" style="width:140px;height:12px"></span><span class="skeleton" style="width:48px;height:10px"></span></div></div></td>
      <td><span class="skeleton" style="width:64px;height:20px;border-radius:999px"></span></td>
      <td class="num"><span class="skeleton" style="width:24px;height:12px;margin-left:auto"></span></td>
      <td class="col-nic"><span class="skeleton" style="width:110px;height:12px"></span></td>
      <td class="col-address"><span class="skeleton" style="width:180px;height:12px"></span></td>
      <td></td>
    </tr>`;
  els.results.innerHTML = tableHtml(Array.from({ length: 6 }, row).join(""));
}

function tableHtml(rows) {
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">Student</th>
            <th scope="col">Gender</th>
            <th scope="col" class="num">Age</th>
            <th scope="col" class="col-nic">NIC</th>
            <th scope="col" class="col-address">Address</th>
            <th scope="col" class="actions-col"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderResults() {
  const filters = currentFilters();
  if (state.error) {
    els.results.innerHTML = emptyHtml({
      art: "alert-triangle",
      danger: true,
      title: "Couldn't load students",
      text: state.error.message,
      action: `<button type="button" class="btn btn-secondary" data-action="retry">${icon("refresh-cw", { size: 15 })}<span>Try again</span></button>`
    });
  } else if (!state.items.length) {
    els.results.innerHTML = filters.term || filters.gender ? filteredEmptyHtml(filters) : emptyHtml({
      art: "users",
      title: "No students yet",
      text: "Students you register will appear here, ready to search, edit and export.",
      action: `<a class="btn btn-primary" href="registerForm.html">${icon("user-plus", { size: 15 })}<span>Register the first student</span></a>`
    });
  } else if (state.view === "grid") {
    els.results.innerHTML = `<div class="card-grid">${state.items.map(cardHtml).join("")}</div>`;
  } else {
    els.results.innerHTML = tableHtml(state.items.map(rowHtml).join(""));
  }
  renderPagination();
}

function filteredEmptyHtml(filters) {
  const field = SEARCH_FIELDS[filters.field];
  const parts = [];
  if (filters.term) parts.push(`${field.label} “${escapeHtml(filters.term)}”`);
  if (filters.gender) parts.push(`gender ${GENDER_LABELS[filters.gender].toLowerCase()}`);
  return emptyHtml({
    art: "search-x",
    title: "No matching students",
    text: isInvalidIdSearch(filters)
      ? "Student IDs are whole numbers, for example 42."
      : `Nothing matches ${parts.join(" and ")}. Try a different search or clear the filters.`,
    action: `<button type="button" class="btn btn-secondary" data-action="clear-filters">${icon("x", { size: 15 })}<span>Clear filters</span></button>`
  });
}

function emptyHtml({ art, title, text, action = "", danger = false }) {
  return `
    <div class="empty">
      <div class="empty-art ${danger ? "danger" : ""}">${icon(art, { size: 24 })}</div>
      <h3>${title}</h3>
      <p>${text}</p>
      ${action}
    </div>`;
}

function termFor(field) {
  const filters = currentFilters();
  return filters.field === field ? filters.term : "";
}

function actionButtons(student) {
  const name = escapeHtml(fullName(student));
  return `
    <button type="button" class="btn btn-ghost btn-icon btn-sm" data-action="edit" aria-label="Edit ${name}" title="Edit">${icon("pencil", { size: 15 })}</button>
    <button type="button" class="btn btn-ghost btn-icon btn-sm danger-hover" data-action="delete" aria-label="Delete ${name}" title="Delete">${icon("trash", { size: 15 })}</button>`;
}

function rowHtml(student) {
  return `
    <tr data-id="${student.id}" tabindex="0">
      <td>
        <div class="cell-student">
          ${avatarHtml(student)}
          <div class="cell-text">
            <p class="cell-name">${highlight(fullName(student), termFor("name"))}</p>
            <p class="cell-sub mono">#${student.id}</p>
          </div>
        </div>
      </td>
      <td>${genderBadge(student.gender)}</td>
      <td class="num">${student.age}</td>
      <td class="col-nic"><span class="mono">${highlight(student.nic, termFor("nic"))}</span></td>
      <td class="col-address"><span class="cell-address" title="${escapeHtml(student.address)}">${escapeHtml(student.address)}</span></td>
      <td><div class="row-actions">${actionButtons(student)}</div></td>
    </tr>`;
}

function cardHtml(student, index) {
  return `
    <article class="student-card" data-id="${student.id}" tabindex="0" style="animation-delay:${index * 25}ms">
      <div class="student-card-head">${avatarHtml(student, "lg")}${genderBadge(student.gender)}</div>
      <div>
        <h3>${highlight(fullName(student), termFor("name"))}</h3>
        <p class="cell-sub mono">#${student.id}</p>
      </div>
      <div class="meta-list">
        <p class="meta-row">${icon("cake", { size: 15 })}<span><span class="sr-only">Age: </span>${student.age} years</span></p>
        <p class="meta-row">${icon("id-card", { size: 15 })}<span class="mono"><span class="sr-only">NIC: </span>${highlight(student.nic, termFor("nic"))}</span></p>
        <p class="meta-row">${icon("map-pin", { size: 15 })}<span title="${escapeHtml(student.address)}"><span class="sr-only">Address: </span>${escapeHtml(student.address)}</span></p>
      </div>
      <div class="card-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-action="view">${icon("eye", { size: 14 })}<span>View</span></button>
        ${actionButtons(student)}
      </div>
    </article>`;
}

function renderPagination() {
  if (!state.loaded || state.error || !state.totalItems) {
    els.pagination.hidden = true;
    return;
  }
  els.pagination.hidden = false;
  const from = state.page * PAGE_SIZE + 1;
  const to = from + state.items.length - 1;
  const pager = state.totalPages > 1 ? `
    <nav class="pager" aria-label="Pagination">
      <button type="button" class="pager-btn" data-page="${state.page - 1}" ${state.page === 0 ? "disabled" : ""} aria-label="Previous page">${icon("chevron-left")}</button>
      ${pageList(state.page, state.totalPages).map((page) => (page === "gap"
        ? '<span class="pager-gap">…</span>'
        : `<button type="button" class="pager-btn" data-page="${page}" ${page === state.page ? 'aria-current="page"' : ""}>${page + 1}</button>`)).join("")}
      <button type="button" class="pager-btn" data-page="${state.page + 1}" ${state.page >= state.totalPages - 1 ? "disabled" : ""} aria-label="Next page">${icon("chevron-right")}</button>
    </nav>` : "";
  els.pagination.innerHTML = `
    <p>Showing <strong>${from}–${to}</strong> of <strong>${state.totalItems.toLocaleString()}</strong> ${state.totalItems === 1 ? "student" : "students"}</p>
    ${pager}`;
}

/** First, last and the pages around the current one, with gaps in between. */
function pageList(current, total) {
  const pages = [...new Set([0, total - 1, current - 1, current, current + 1])]
    .filter((page) => page >= 0 && page < total)
    .sort((a, b) => a - b);
  const result = [];
  pages.forEach((page, index) => {
    if (index && page - pages[index - 1] > 1) result.push("gap");
    result.push(page);
  });
  return result;
}

function onResultsClick(event) {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton?.dataset.action === "retry") return loadStudents();
  if (actionButton?.dataset.action === "clear-filters") return clearFilters();

  const item = event.target.closest("[data-id]");
  if (!item) return;
  const id = Number(item.dataset.id);
  const student = state.items.find((s) => s.id === id);

  if (actionButton?.dataset.action === "delete") return confirmDelete(student);
  if (actionButton?.dataset.action === "edit") return openStudent(id, { mode: "edit" });
  openStudent(id);
}

/* ==========================================
   DRAWER: VIEW / EDIT / DELETE
   ========================================== */
async function openStudent(id, { mode = "view" } = {}) {
  const cached = state.items.find((student) => student.id === id);
  drawer.mode = mode;
  drawer.student = cached || null;

  if (cached) renderDrawer();
  else renderDrawerSkeleton();
  openOverlay(els.drawer, { onClose: () => { drawer.student = null; } });
  if (cached) return focusDrawer();

  try {
    const student = (await apiRequest(studentListUrl({ id, size: 1 }))).items[0];
    if (!student) {
      closeOverlay(els.drawer);
      toast(`Student #${id} doesn't exist or has been deleted.`, { type: "error", title: "Student not found" });
      return;
    }
    drawer.student = student;
    renderDrawer();
    focusDrawer();
  } catch (error) {
    closeOverlay(els.drawer);
    toast(error.message, { type: "error", title: "Couldn't open student" });
  }
}

function focusDrawer() {
  const target = drawer.mode === "edit" ? els.drawerBody.querySelector("input") : els.drawer.querySelector("[data-close]");
  target?.focus({ preventScroll: true });
}

function renderDrawerSkeleton() {
  els.drawerTitle.textContent = "Student profile";
  els.drawerBody.innerHTML = `
    <div class="profile">
      <span class="skeleton" style="width:72px;height:72px;border-radius:50%"></span>
      <span class="skeleton" style="width:180px;height:18px;margin-top:12px"></span>
      <span class="skeleton" style="width:110px;height:14px"></span>
    </div>
    <div style="display:grid;gap:10px">${'<span class="skeleton" style="height:44px"></span>'.repeat(5)}</div>`;
  els.drawerFooter.innerHTML = "";
}

function detailRow(iconName, label, valueHtml, extra = "") {
  return `<div class="detail-row"><dt>${icon(iconName, { size: 15 })}${label}</dt><dd>${valueHtml}</dd>${extra || "<span></span>"}</div>`;
}

function renderDrawer() {
  const student = drawer.student;
  if (drawer.mode === "edit") {
    els.drawerTitle.textContent = "Edit student";
    els.drawerBody.innerHTML = `<form id="drawer-form" class="drawer-form" novalidate>${editFieldsHtml(student)}</form>`;
    els.drawerFooter.innerHTML = `
      <button type="button" class="btn btn-ghost" data-drawer-action="cancel"><span>Cancel</span></button>
      <span class="spacer"></span>
      <button type="submit" class="btn btn-primary" form="drawer-form">${icon("check", { size: 15 })}<span>Save changes</span></button>`;
    const form = $("#drawer-form");
    bindErrorClearing(form);
    form.addEventListener("submit", submitEdit);
    form.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) form.requestSubmit();
    });
    return;
  }

  els.drawerTitle.textContent = "Student profile";
  els.drawerBody.innerHTML = `
    <div class="profile">
      ${avatarHtml(student, "xl")}
      <h3>${escapeHtml(fullName(student))}</h3>
      <div class="profile-meta">${genderBadge(student.gender)}<span class="chip mono">#${student.id}</span></div>
    </div>
    <dl class="detail-list">
      ${detailRow("user", "First name", escapeHtml(student.firstName))}
      ${detailRow("user", "Last name", escapeHtml(student.lastName))}
      ${detailRow("cake", "Age", `${student.age} years`)}
      ${detailRow("id-card", "NIC", `<span class="mono">${escapeHtml(student.nic)}</span>`,
        `<button type="button" class="btn btn-ghost btn-icon btn-sm" data-drawer-action="copy-nic" aria-label="Copy NIC" title="Copy NIC">${icon("copy", { size: 14 })}</button>`)}
      ${detailRow("map-pin", "Address", escapeHtml(student.address))}
    </dl>`;
  els.drawerFooter.innerHTML = `
    <button type="button" class="btn btn-danger-ghost" data-drawer-action="delete">${icon("trash", { size: 15 })}<span>Delete</span></button>
    <span class="spacer"></span>
    <button type="button" class="btn btn-primary" data-drawer-action="edit">${icon("pencil", { size: 15 })}<span>Edit details</span></button>`;
}

function editFieldsHtml(student) {
  const field = (name, label, value, attrs = "") => `
    <div class="field">
      <label class="label" for="edit-${name}">${label}</label>
      <input class="input" id="edit-${name}" name="${name}" value="${escapeHtml(value)}" ${attrs}>
      <p class="field-error" data-error-for="${name}" hidden></p>
    </div>`;
  return `
    <div class="form-row">
      ${field("firstName", "First name", student.firstName, 'autocomplete="off"')}
      ${field("lastName", "Last name", student.lastName, 'autocomplete="off"')}
    </div>
    <div class="field">
      <span class="label" id="edit-gender-label">Gender</span>
      <div class="segmented segmented-block" role="radiogroup" aria-labelledby="edit-gender-label">
        ${Object.entries(GENDER_LABELS).map(([value, label]) => `
          <label><input type="radio" name="gender" value="${value}" ${student.gender === value ? "checked" : ""}><span>${label}</span></label>`).join("")}
      </div>
      <p class="field-error" data-error-for="gender" hidden></p>
    </div>
    <div class="form-row">
      ${field("age", "Age", student.age, 'type="number" inputmode="numeric" min="1" max="120"')}
      ${field("nic", "NIC", student.nic, 'autocomplete="off" spellcheck="false"')}
    </div>
    <div class="field">
      <label class="label" for="edit-address">Address</label>
      <textarea class="textarea" id="edit-address" name="address" rows="3">${escapeHtml(student.address)}</textarea>
      <p class="field-error" data-error-for="address" hidden></p>
    </div>`;
}

async function submitEdit(event) {
  event.preventDefault();
  const form = event.target;
  const values = readStudentForm(form);
  const errors = validateStudent(values);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    return;
  }

  const button = els.drawerFooter.querySelector('[type="submit"]');
  const previous = drawer.student;
  setLoading(button, true);
  try {
    const saved = await saveStudent(toStudentPayload(values, previous.id));
    drawer.student = saved;
    drawer.mode = "view";
    renderDrawer();
    focusDrawer();

    const index = state.items.findIndex((student) => student.id === saved.id);
    if (index > -1) {
      state.items[index] = saved;
      renderResults();
    }
    if (saved.gender !== previous.gender) loadStats();
    toast(`${fullName(saved)}'s details were updated.`, { title: "Changes saved" });
  } catch (error) {
    setLoading(button, false);
    if (!applyServerErrors(form, error)) toast(error.message, { type: "error", title: "Couldn't save changes" });
  }
}

function onDrawerAction(event) {
  const action = event.target.closest("[data-drawer-action]")?.dataset.drawerAction;
  if (!action || !drawer.student) return;

  if (action === "edit" || action === "cancel") {
    drawer.mode = action === "edit" ? "edit" : "view";
    renderDrawer();
    focusDrawer();
  } else if (action === "delete") {
    confirmDelete(drawer.student);
  } else if (action === "copy-nic") {
    navigator.clipboard?.writeText(drawer.student.nic)
      .then(() => toast("NIC copied to clipboard.", { type: "info" }))
      .catch(() => toast("Couldn't access the clipboard.", { type: "error" }));
  }
}

function confirmDelete(student) {
  if (!student) return;
  confirmDialog({
    title: "Delete this student?",
    messageHtml: `<strong>${escapeHtml(fullName(student))}</strong> (#${student.id}) will be removed from the directory.`,
    confirmLabel: "Delete student",
    danger: true,
    onConfirm: async () => {
      await apiRequest(`${STUDENT_API}/delete/${student.id}`, { method: "DELETE" });
      if (drawer.student?.id === student.id) closeOverlay(els.drawer);
      toast(`${fullName(student)} was removed from the directory.`, { title: "Student deleted" });
      loadStudents();
      loadStats();
    }
  });
}

/* ==========================================
   CSV EXPORT
   ========================================== */
async function exportCsv() {
  const filters = currentFilters();
  if (isInvalidIdSearch(filters)) {
    toast("There are no students to export.", { type: "info" });
    return;
  }

  setLoading(els.exportButton, true);
  try {
    const students = [];
    let page = 0;
    let totalPages = 1;
    while (page < totalPages) {
      const result = await apiRequest(studentListUrl(toQuery(filters, page, EXPORT_PAGE_SIZE)));
      students.push(...result.items);
      totalPages = result.totalPages;
      page += 1;
    }
    if (!students.length) {
      toast("There are no students to export.", { type: "info" });
      return;
    }

    const header = ["ID", "First name", "Last name", "Gender", "Age", "NIC", "Address"];
    const rows = students.map((s) => [s.id, s.firstName, s.lastName, GENDER_LABELS[s.gender] || s.gender, s.age, s.nic, s.address]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    // BOM so Excel opens the file as UTF-8
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);

    toast(`${plural(students.length, "student")} exported.`, { title: "Export ready" });
  } catch (error) {
    toast(error.message, { type: "error", title: "Export failed" });
  } finally {
    setLoading(els.exportButton, false);
  }
}

/** Quotes a CSV value and defuses spreadsheet formulas (=, +, -, @). */
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
