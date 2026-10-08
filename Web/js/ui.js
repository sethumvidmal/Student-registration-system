/**
 * EduManage - shared UI layer.
 * Theme, app shell (sidebar + topbar), toasts, overlays and dialogs, the ⌘K command
 * palette, keyboard shortcuts, and helpers for the API and the student form.
 * Load after icons.js and auth.js, before the page script.
 */

// API_ROOT comes from auth.js
const STUDENT_API = `${API_ROOT}/student`;
const API_DOCS_URL = `${API_ROOT}/swagger-ui/index.html`;
const THEME_KEY = "edumanage.theme";
const GENDER_LABELS = { M: "Male", F: "Female" };
const IS_MAC = /Mac|iPhone|iPad/i.test(navigator.userAgent);
const MOD_KEY = IS_MAC ? "⌘" : "Ctrl";
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

const $ = (selector, root = document) => root.querySelector(selector);

/* ==========================================
   FORMATTING
   ========================================== */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Escapes text and wraps the first case-insensitive match of term in <mark>. */
function highlight(text, term) {
  const value = String(text ?? "");
  const index = term ? value.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (index === -1) return escapeHtml(value);
  return escapeHtml(value.slice(0, index))
    + `<mark>${escapeHtml(value.slice(index, index + term.length))}</mark>`
    + escapeHtml(value.slice(index + term.length));
}

function fullName(person = {}) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
}

function initials(person = {}) {
  const value = `${(person.firstName || "").charAt(0)}${(person.lastName || "").charAt(0)}`.toUpperCase();
  return value || "?";
}

/** Stable hue per name, so a student keeps the same avatar colour everywhere. */
function hueFor(text) {
  let hash = 0;
  for (const ch of String(text)) hash = (hash * 31 + ch.codePointAt(0)) % 360;
  return hash;
}

function avatarHtml(person, size = "") {
  const sizeClass = size ? ` avatar-${size}` : "";
  return `<span class="avatar${sizeClass}" style="--h:${hueFor(fullName(person) || person.email || "")}" aria-hidden="true">`
    + `${escapeHtml(initials(person))}</span>`;
}

function genderBadge(gender) {
  if (!GENDER_LABELS[gender]) return `<span class="badge badge-neutral">Not set</span>`;
  return `<span class="badge badge-${gender === "F" ? "female" : "male"}">${GENDER_LABELS[gender]}</span>`;
}

function formatRole(role) {
  const words = String(role || "").toLowerCase().split("_").filter(Boolean);
  if (!words.length) return "";
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ");
}

function plural(count, word) {
  return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
}

/** Counts a number up (or down) to its new value. */
function animateNumber(element, to) {
  if (!element) return;
  const from = Number(element.dataset.value || 0);
  element.dataset.value = to;
  if (from === to || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.textContent = to.toLocaleString();
    return;
  }
  const start = performance.now();
  const duration = 700;
  const step = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(from + (to - from) * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ==========================================
   API
   ========================================== */
class ApiRequestError extends Error {
  constructor(message, { status = 0, code = "", fields = {} } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields || {};
  }
}

/**
 * Calls the API and returns the unwrapped `data`. Failures throw an ApiRequestError
 * carrying the HTTP status, the error code and, for 422, the message per field.
 */
async function apiRequest(url, options = {}) {
  let res;
  try {
    res = await authFetch(url, options);
  } catch (error) {
    throw new ApiRequestError("Can't reach the server. Make sure the backend is running on port 8080.",
      { code: "NETWORK_ERROR" });
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.success === false) {
    throw new ApiRequestError(body?.message || `Request failed (${res.status})`,
      { status: res.status, code: body?.error?.code, fields: body?.error?.fields });
  }
  return body?.data;
}

/** Builds a /student/list URL; empty filters are left out. */
function studentListUrl(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  return `${STUDENT_API}/list?${params}`;
}

function saveStudent(payload) {
  return apiRequest(`${STUDENT_API}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

/* ==========================================
   STUDENT FORM HELPERS (register page + edit drawer)
   ========================================== */
function readStudentForm(form) {
  const data = new FormData(form);
  const text = (name) => String(data.get(name) || "").trim();
  return {
    firstName: text("firstName"),
    lastName: text("lastName"),
    gender: data.get("gender") || "",
    age: text("age"),
    nic: text("nic"),
    address: text("address")
  };
}

/** Mirrors the backend rules so most mistakes are caught before a round trip. */
function validateStudent(values) {
  const errors = {};
  if (!values.firstName) errors.firstName = "First name is required";
  if (!values.lastName) errors.lastName = "Last name is required";
  if (!GENDER_LABELS[values.gender]) errors.gender = "Select a gender";
  if (!values.age) {
    errors.age = "Age is required";
  } else if (!/^\d+$/.test(values.age) || Number(values.age) < 1 || Number(values.age) > 120) {
    errors.age = "Age must be a whole number from 1 to 120";
  }
  if (!values.nic) errors.nic = "NIC is required";
  if (!values.address) errors.address = "Address is required";
  return errors;
}

function toStudentPayload(values, id) {
  return { ...(id ? { id } : {}), ...values, age: Number(values.age) };
}

function clearFieldErrors(form) {
  form.querySelectorAll("[data-error-for]").forEach((slot) => { slot.hidden = true; slot.textContent = ""; });
  form.querySelectorAll('[aria-invalid="true"]').forEach((input) => input.removeAttribute("aria-invalid"));
}

function showFieldErrors(form, errors) {
  clearFieldErrors(form);
  let first = null;
  Object.entries(errors).forEach(([name, message]) => {
    const slot = form.querySelector(`[data-error-for="${name}"]`);
    if (slot) {
      slot.innerHTML = `${icon("alert-circle", { size: 13 })}<span>${escapeHtml(message)}</span>`;
      slot.hidden = false;
    }
    const control = form.elements[name];
    const input = control instanceof Element ? control : control?.[0];
    if (control instanceof Element) control.setAttribute("aria-invalid", "true");
    first = first || input;
  });
  first?.focus();
}

/** Shows server-side validation (422) and duplicate NIC (409) errors on their fields. */
function applyServerErrors(form, error) {
  if (error.code === "VALIDATION_ERROR" && Object.keys(error.fields).length) {
    showFieldErrors(form, error.fields);
    return true;
  }
  if (error.code === "NIC_ALREADY_EXISTS") {
    showFieldErrors(form, { nic: error.message });
    return true;
  }
  return false;
}

/** Removes a field's error as soon as the user edits it. */
function bindErrorClearing(form) {
  const clear = (event) => {
    const name = event.target.name;
    if (!name) return;
    const slot = form.querySelector(`[data-error-for="${name}"]`);
    if (slot) slot.hidden = true;
    event.target.removeAttribute("aria-invalid");
  };
  form.addEventListener("input", clear);
  form.addEventListener("change", clear);
}

function setLoading(button, loading) {
  if (!button) return;
  if (loading && !button.querySelector(".spinner")) {
    button.insertAdjacentHTML("beforeend", '<span class="spinner" aria-hidden="true"></span>');
  }
  button.classList.toggle("is-loading", loading);
  button.disabled = loading;
  button.setAttribute("aria-busy", String(loading));
}

/* ==========================================
   THEME
   ========================================== */
function getThemePreference() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch (error) {
    return "system";
  }
}

function effectiveTheme() {
  const preference = getThemePreference();
  if (preference !== "system") return preference;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(preference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, preference);
  } catch (error) {
    // Storage blocked: the choice still applies to this page
  }
  if (preference === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", preference);
  updateThemeUI();
}

function toggleTheme() {
  setTheme(effectiveTheme() === "dark" ? "light" : "dark");
}

function updateThemeUI() {
  const dark = effectiveTheme() === "dark";
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.innerHTML = icon(dark ? "sun" : "moon", { size: 17 });
    button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    button.title = dark ? "Light theme (T)" : "Dark theme (T)";
  });
  const preference = getThemePreference();
  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeOption === preference));
  });
}

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateThemeUI);

/* ==========================================
   TOASTS
   ========================================== */
const TOAST_ICONS = { success: "check-circle", error: "alert-circle", info: "info" };

function toast(message, { type = "success", title = "", duration = 4500 } = {}) {
  let region = $("#toast-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "toast-region";
    region.className = "toast-region";
    region.setAttribute("aria-live", "polite");
    document.body.appendChild(region);
  }

  const element = document.createElement("div");
  element.className = `toast toast-${type}`;
  element.setAttribute("role", type === "error" ? "alert" : "status");
  element.innerHTML = `
    <span class="toast-icon">${icon(TOAST_ICONS[type] || "info", { size: 18 })}</span>
    <div class="toast-body">
      ${title ? `<p class="toast-title">${escapeHtml(title)}</p>` : ""}
      <p class="toast-message">${escapeHtml(message)}</p>
    </div>
    <button type="button" class="toast-close" aria-label="Dismiss">${icon("x", { size: 14 })}</button>`;

  const dismiss = () => {
    element.classList.add("is-leaving");
    setTimeout(() => element.remove(), 200);
  };
  element.querySelector(".toast-close").addEventListener("click", dismiss);
  region.appendChild(element);

  // Pause the countdown while the pointer is over the toast
  let timer = setTimeout(dismiss, duration);
  element.addEventListener("mouseenter", () => clearTimeout(timer));
  element.addEventListener("mouseleave", () => { timer = setTimeout(dismiss, 1500); });
}

/* ==========================================
   OVERLAYS (drawer, dialogs, palette)
   ========================================== */
const overlayStack = [];

function isOverlayOpen(overlay) {
  return overlayStack.some((entry) => entry.overlay === overlay);
}

function openOverlay(overlay, { onClose, initialFocus } = {}) {
  clearTimeout(overlay._hideTimer);
  if (!overlay._wired) {
    overlay._wired = true;
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay) closeOverlay(overlay);
    });
    overlay.addEventListener("click", (event) => {
      if (event.target.closest("[data-close]")) closeOverlay(overlay);
    });
  }
  if (!isOverlayOpen(overlay)) {
    overlayStack.push({ overlay, onClose, returnFocus: document.activeElement });
  }
  overlay.hidden = false;
  overlay.getBoundingClientRect(); // commit the hidden state so the transition runs
  overlay.classList.add("is-open");
  document.body.classList.add("has-overlay");
  const target = initialFocus || overlay.querySelector("[autofocus]") || overlay.querySelector(FOCUSABLE);
  target?.focus({ preventScroll: true });
}

function closeOverlay(overlay) {
  const index = overlayStack.findIndex((entry) => entry.overlay === overlay);
  if (index === -1) return;
  const [entry] = overlayStack.splice(index, 1);
  overlay.classList.remove("is-open");
  overlay._hideTimer = setTimeout(() => { overlay.hidden = true; }, 220);
  if (!overlayStack.length) document.body.classList.remove("has-overlay");
  // Skip elements that are gone or sit inside an overlay that is closing too
  const returnFocus = entry.returnFocus;
  if (returnFocus && document.contains(returnFocus) && !returnFocus.closest(".overlay:not(.is-open)")) {
    returnFocus.focus({ preventScroll: true });
  }
  entry.onClose?.();
}

function trapFocus(event, container) {
  const items = [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (!container.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Confirmation dialog. onConfirm may be async: the button shows a spinner and the
 * dialog stays open (with an error toast) if it throws.
 */
function confirmDialog({ title, messageHtml, confirmLabel = "Confirm", danger = false, onConfirm }) {
  const overlay = document.createElement("div");
  overlay.className = "overlay modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
      <div class="modal-icon ${danger ? "danger" : ""}">${icon(danger ? "trash" : "info", { size: 20 })}</div>
      <h2 id="confirm-title">${escapeHtml(title)}</h2>
      <p id="confirm-message">${messageHtml}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" data-close><span>Cancel</span></button>
        <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-confirm><span>${escapeHtml(confirmLabel)}</span></button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const confirmButton = overlay.querySelector("[data-confirm]");
  confirmButton.addEventListener("click", async () => {
    setLoading(confirmButton, true);
    try {
      await onConfirm();
      closeOverlay(overlay);
    } catch (error) {
      toast(error.message, { type: "error", title: "Something went wrong" });
      setLoading(confirmButton, false);
    }
  });
  // Destructive actions start on Cancel so Enter never deletes by accident
  openOverlay(overlay, {
    initialFocus: overlay.querySelector("[data-close]"),
    onClose: () => setTimeout(() => overlay.remove(), 250)
  });
}

/* ==========================================
   KEYBOARD SHORTCUTS DIALOG
   ========================================== */
const SHORTCUTS = [
  [[MOD_KEY, "K"], "Open the command palette"],
  [["/"], "Search students"],
  [["N"], "Register a new student"],
  [["T"], "Toggle light / dark theme"],
  [["?"], "Show keyboard shortcuts"],
  [["Esc"], "Close panels and dialogs"]
];

let shortcutsOverlay = null;

function openShortcuts() {
  if (!shortcutsOverlay) {
    shortcutsOverlay = document.createElement("div");
    shortcutsOverlay.className = "overlay modal-overlay";
    shortcutsOverlay.hidden = true;
    shortcutsOverlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <div class="modal-head">
          <h2 id="shortcuts-title">Keyboard shortcuts</h2>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Close">${icon("x")}</button>
        </div>
        <div class="shortcut-list">
          ${SHORTCUTS.map(([keys, label]) => `
            <div class="shortcut-row"><span>${label}</span>
              <span class="shortcut-keys">${keys.map((key) => `<kbd class="kbd">${key}</kbd>`).join("")}</span>
            </div>`).join("")}
        </div>
      </div>`;
    document.body.appendChild(shortcutsOverlay);
  }
  openOverlay(shortcutsOverlay);
}

/* ==========================================
   COMMAND PALETTE
   ========================================== */
const palette = { overlay: null, input: null, list: null, items: [], active: 0, query: "", students: [], searching: false, seq: 0, timer: null };

function paletteCommands() {
  const dark = effectiveTheme() === "dark";
  return [
    { group: "Navigation", label: "Go to students", icon: "users", run: () => { location.href = "index.html"; } },
    { group: "Navigation", label: "Register a new student", icon: "user-plus", kbd: "N", run: () => { location.href = "registerForm.html"; } },
    { group: "Preferences", label: dark ? "Switch to light theme" : "Switch to dark theme", icon: dark ? "sun" : "moon", kbd: "T", run: toggleTheme },
    { group: "Preferences", label: "Use system theme", icon: "monitor", run: () => setTheme("system") },
    { group: "Help", label: "Keyboard shortcuts", icon: "keyboard", kbd: "?", run: openShortcuts },
    { group: "Help", label: "Open API documentation", icon: "book-open", run: () => window.open(API_DOCS_URL, "_blank", "noopener") },
    { group: "Account", label: "Log out", icon: "log-out", run: logout }
  ];
}

function buildPalette() {
  const overlay = document.createElement("div");
  overlay.className = "overlay palette-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="palette-search">
        ${icon("search", { size: 18 })}
        <input type="text" placeholder="Search students by name, NIC or ID, or type a command…" autocomplete="off"
               spellcheck="false" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list">
        <kbd class="kbd">Esc</kbd>
      </div>
      <div class="palette-results" id="palette-list" role="listbox" aria-label="Results"></div>
      <div class="palette-footer">
        <span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> Navigate</span>
        <span><kbd class="kbd">↵</kbd> Open</span>
        <span><kbd class="kbd">Esc</kbd> Close</span>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  palette.overlay = overlay;
  palette.input = overlay.querySelector("input");
  palette.list = overlay.querySelector("#palette-list");

  palette.input.addEventListener("input", () => {
    palette.query = palette.input.value.trim();
    palette.active = 0;
    scheduleStudentSearch();
    renderPalette();
  });
  palette.input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!palette.items.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      palette.active = (palette.active + step + palette.items.length) % palette.items.length;
      highlightPaletteItem();
    } else if (event.key === "Enter") {
      event.preventDefault();
      runPaletteItem(palette.active);
    }
  });
  palette.list.addEventListener("mousemove", (event) => {
    const item = event.target.closest("[data-index]");
    if (item && Number(item.dataset.index) !== palette.active) {
      palette.active = Number(item.dataset.index);
      highlightPaletteItem();
    }
  });
  palette.list.addEventListener("click", (event) => {
    const item = event.target.closest("[data-index]");
    if (item) runPaletteItem(Number(item.dataset.index));
  });
}

function scheduleStudentSearch() {
  clearTimeout(palette.timer);
  const query = palette.query;
  const seq = ++palette.seq;
  if (!query) {
    palette.students = [];
    palette.searching = false;
    return;
  }
  palette.searching = true;
  palette.timer = setTimeout(async () => {
    let found = [];
    try {
      found = await findStudents(query);
    } catch (error) {
      found = [];
    }
    if (seq !== palette.seq) return;
    palette.students = found;
    palette.searching = false;
    renderPalette();
  }, 180);
}

/** Searches by name and NIC (and by ID when the query is a number), merged and de-duplicated. */
async function findStudents(query) {
  const requests = [
    apiRequest(studentListUrl({ name: query, size: 6 })),
    apiRequest(studentListUrl({ nic: query, size: 6 }))
  ];
  if (/^[1-9]\d*$/.test(query)) requests.unshift(apiRequest(studentListUrl({ id: query, size: 1 })));

  const found = new Map();
  (await Promise.allSettled(requests)).forEach((result) => {
    if (result.status === "fulfilled") result.value.items.forEach((student) => found.has(student.id) || found.set(student.id, student));
  });
  return [...found.values()].slice(0, 6);
}

function renderPalette() {
  const query = palette.query.toLowerCase();
  const students = palette.query
    ? palette.students.map((student) => ({ group: "Students", student, run: () => openStudentAnywhere(student.id) }))
    : [];
  const commands = paletteCommands().filter((command) => !query || command.label.toLowerCase().includes(query));
  palette.items = [...students, ...commands];
  palette.active = Math.min(palette.active, Math.max(palette.items.length - 1, 0));

  let html = "";
  if (palette.query && palette.searching && !students.length) {
    html += `<p class="palette-group">Students</p><div class="palette-status"><span class="spinner"></span>Searching students…</div>`;
  }
  let lastGroup = "";
  palette.items.forEach((item, index) => {
    if (item.group !== lastGroup) {
      html += `<p class="palette-group">${item.group}</p>`;
      lastGroup = item.group;
    }
    html += item.student ? paletteStudentHtml(item.student, index) : paletteCommandHtml(item, index);
  });
  if (!palette.items.length && !palette.searching) {
    html = `<div class="palette-empty">No results for “${escapeHtml(palette.query)}”</div>`;
  }
  palette.list.innerHTML = html;
  highlightPaletteItem();
}

function paletteStudentHtml(student, index) {
  return `<button type="button" class="palette-item" role="option" id="palette-option-${index}" data-index="${index}" tabindex="-1">
      ${avatarHtml(student, "sm")}
      <span class="palette-label">${highlight(fullName(student), palette.query)}<span class="palette-sub mono">#${student.id} · ${highlight(student.nic, palette.query)}</span></span>
      ${genderBadge(student.gender)}
      <span class="palette-enter">${icon("corner-down-left", { size: 14 })}</span>
    </button>`;
}

function paletteCommandHtml(command, index) {
  return `<button type="button" class="palette-item" role="option" id="palette-option-${index}" data-index="${index}" tabindex="-1">
      <span class="icon-box">${icon(command.icon, { size: 15 })}</span>
      <span class="palette-label">${escapeHtml(command.label)}</span>
      ${command.kbd ? `<kbd class="kbd">${command.kbd}</kbd>` : `<span class="palette-enter">${icon("corner-down-left", { size: 14 })}</span>`}
    </button>`;
}

function highlightPaletteItem() {
  palette.list.querySelectorAll("[data-index]").forEach((element) => {
    const selected = Number(element.dataset.index) === palette.active;
    element.setAttribute("aria-selected", String(selected));
    if (selected) element.scrollIntoView({ block: "nearest" });
  });
  if (palette.items.length) palette.input.setAttribute("aria-activedescendant", `palette-option-${palette.active}`);
  else palette.input.removeAttribute("aria-activedescendant");
}

function runPaletteItem(index) {
  const item = palette.items[index];
  if (!item) return;
  closeOverlay(palette.overlay);
  item.run();
}

function openPalette() {
  if (!palette.overlay) buildPalette();
  palette.input.value = "";
  palette.query = "";
  palette.students = [];
  palette.searching = false;
  palette.active = 0;
  renderPalette();
  openOverlay(palette.overlay, { initialFocus: palette.input });
}

function togglePalette() {
  if (palette.overlay && isOverlayOpen(palette.overlay)) closeOverlay(palette.overlay);
  else openPalette();
}

/** Opens a student's profile: in place on the students page, otherwise via a deep link. */
function openStudentAnywhere(id) {
  if (typeof window.openStudent === "function") window.openStudent(id);
  else location.href = `index.html?view=${id}`;
}

/* ==========================================
   APP SHELL
   ========================================== */
const NAV_ITEMS = [
  { page: "students", href: "index.html", icon: "users", label: "Students" },
  { page: "register", href: "registerForm.html", icon: "user-plus", label: "Register student", kbd: "N" }
];
const THEME_OPTIONS = [["light", "sun", "Light"], ["dark", "moon", "Dark"], ["system", "monitor", "System"]];

function renderShell() {
  const sidebar = $("#sidebar");
  const topbar = $("#topbar");
  if (!sidebar || !topbar) return false;

  const page = document.body.dataset.page;
  const user = getSession()?.user || {};

  sidebar.innerHTML = `
    <a class="brand" href="index.html">
      <span class="brand-mark">${icon("graduation-cap", { size: 17 })}</span>
      <span>EduManage</span>
      <span class="brand-tag">Admin</span>
    </a>
    <button type="button" class="search-trigger" data-open-palette>
      ${icon("search", { size: 15 })}<span>Search…</span>
      <span class="kbd-group"><kbd class="kbd">${MOD_KEY}</kbd><kbd class="kbd">K</kbd></span>
    </button>
    <nav class="nav-section" aria-label="Main">
      <p class="nav-heading">Workspace</p>
      ${NAV_ITEMS.map((item) => `
        <a class="nav-item" href="${item.href}" ${item.page === page ? 'aria-current="page"' : ""}>
          ${icon(item.icon, { size: 16 })}<span>${item.label}</span>${item.kbd ? `<kbd class="kbd">${item.kbd}</kbd>` : ""}
        </a>`).join("")}
    </nav>
    <div class="nav-section">
      <p class="nav-heading">Help</p>
      <button type="button" class="nav-item" data-open-shortcuts>${icon("keyboard", { size: 16 })}<span>Keyboard shortcuts</span><kbd class="kbd">?</kbd></button>
      <a class="nav-item" href="${API_DOCS_URL}" target="_blank" rel="noopener">${icon("book-open", { size: 16 })}<span>API docs</span>${icon("external-link", { size: 13, className: "nav-external" })}</a>
    </div>
    <div class="sidebar-footer">
      <div class="popover" id="user-menu" role="menu" aria-label="Account" hidden>
        <div class="popover-header">
          <p class="user-name">${escapeHtml(fullName(user) || "Signed in")}</p>
          <p class="popover-email">${escapeHtml(user.email || "")}</p>
        </div>
        <div class="popover-divider"></div>
        <p class="popover-label">Theme</p>
        <div class="theme-switch" role="group" aria-label="Theme">
          ${THEME_OPTIONS.map(([value, iconName, label]) => `
            <button type="button" data-theme-option="${value}" aria-pressed="false">${icon(iconName, { size: 15 })}<span>${label}</span></button>`).join("")}
        </div>
        <div class="popover-divider"></div>
        <button type="button" class="menu-item menu-item-danger" role="menuitem" data-logout>${icon("log-out", { size: 15 })}<span>Log out</span></button>
      </div>
      <button type="button" class="user-button" id="user-button" aria-haspopup="menu" aria-expanded="false" aria-controls="user-menu">
        ${avatarHtml(user)}
        <span class="user-meta">
          <span class="user-name">${escapeHtml(fullName(user) || "Signed in")}</span>
          <span class="user-role">${escapeHtml(formatRole(user.role))}</span>
        </span>
        ${icon("chevrons-up-down", { size: 15 })}
      </button>
    </div>`;

  topbar.innerHTML = `
    <button type="button" class="btn btn-ghost btn-icon menu-toggle" id="menu-toggle" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${icon("menu", { size: 18 })}</button>
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="index.html">EduManage</a>${icon("chevron-right", { size: 14 })}<strong>${escapeHtml(document.body.dataset.title || "")}</strong>
    </nav>
    <div class="topbar-actions">
      <button type="button" class="btn btn-ghost btn-icon" data-open-palette aria-label="Search (${MOD_KEY}+K)" title="Search (${MOD_KEY}+K)">${icon("search", { size: 17 })}</button>
      <button type="button" class="btn btn-ghost btn-icon" data-theme-toggle></button>
    </div>`;

  const backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";
  document.body.appendChild(backdrop);

  wireShell(sidebar, backdrop);
  return true;
}

function wireShell(sidebar, backdrop) {
  const userButton = $("#user-button");
  const userMenu = $("#user-menu");
  const menuToggle = $("#menu-toggle");

  const setUserMenu = (open) => {
    userMenu.hidden = !open;
    userButton.setAttribute("aria-expanded", String(open));
  };
  const setSidebar = (open) => {
    sidebar.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
  };

  userButton.addEventListener("click", () => setUserMenu(userMenu.hidden));
  menuToggle.addEventListener("click", () => setSidebar(true));
  backdrop.addEventListener("click", () => setSidebar(false));

  document.addEventListener("click", (event) => {
    if (!userMenu.hidden && !event.target.closest("#user-menu, #user-button")) setUserMenu(false);
    if (event.target.closest("[data-open-palette]")) { setSidebar(false); openPalette(); }
    if (event.target.closest("[data-open-shortcuts]")) { setSidebar(false); openShortcuts(); }
    if (event.target.closest("[data-logout]")) logout();
    const themeOption = event.target.closest("[data-theme-option]");
    if (themeOption) setTheme(themeOption.dataset.themeOption);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!userMenu.hidden) { setUserMenu(false); userButton.focus(); }
    if (sidebar.classList.contains("is-open")) setSidebar(false);
  });
}

const NON_TEXT_INPUTS = ["radio", "checkbox", "button", "submit", "reset", "range", "color", "file"];

/** True when keys typed now belong to a text field (radios and buttons don't count). */
function isTyping(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  return target.tagName === "INPUT" && !NON_TEXT_INPUTS.includes(target.type);
}

function initShortcuts() {
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      togglePalette();
      return;
    }

    const top = overlayStack[overlayStack.length - 1]?.overlay;
    if (top) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeOverlay(top);
      } else if (event.key === "Tab") {
        trapFocus(event, top);
      }
      return;
    }

    if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "/") {
      event.preventDefault();
      const search = $("[data-search-input]");
      if (search) search.focus();
      else openPalette();
    } else if (event.key === "n" || event.key === "N") {
      if (document.body.dataset.page !== "register") location.href = "registerForm.html";
    } else if (event.key === "t" || event.key === "T") {
      toggleTheme();
    } else if (event.key === "?") {
      openShortcuts();
    }
  });
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-theme-toggle]")) toggleTheme();
});

document.addEventListener("DOMContentLoaded", () => {
  hydrateIcons();
  if (renderShell()) initShortcuts();
  updateThemeUI();
});
