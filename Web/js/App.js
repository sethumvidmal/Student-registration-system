/**
 * Student Registration System - Frontend App Logic
 * Backend URL: http://localhost:8080/student
 * API calls go through authFetch() from auth.js, which adds the JWT.
 * Every response is wrapped as { success, message, data } or { success, message, error }.
 */

const API_BASE_URL = "http://localhost:8080/student";
const GENDER_LABELS = { M: "Male", F: "Female" };
const PAGE_SIZE = 12;
const SEARCH_PLACEHOLDERS = { name: "Search by name...", nic: "Search by NIC...", id: "Search by student ID..." };

// Global State
let studentsList = []; // students on the current page
let currentPage = 0;
let totalPages = 0;
let currentViewMode = "grid"; // 'grid' or 'table'
let currentDeleteId = null;
let searchDebounce = null;

// DOM Load Handler
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  
  // Page specific initializations
  if (document.getElementById("students-container")) {
    initDirectoryPage();
  }

  if (document.getElementById("student-register-form")) {
    initRegisterPage();
  }
});

/* ==========================================
   NAVIGATION & MOBILE MENU
   ========================================== */
function initNavigation() {
  const toggleBtn = document.getElementById("mobile-menu-toggle");
  const navLinks = document.getElementById("nav-links");

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener("click", () => {
      navLinks.classList.toggle("show");
    });
  }
}

/* ==========================================
   TOAST NOTIFICATION SYSTEM
   ========================================== */
function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === "success" ? "✓" : "✕"}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideInRight 0.3s ease reverse forwards";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ==========================================
   DIRECTORY PAGE LOGIC (index.html)
   ========================================== */
function initDirectoryPage() {
  loadStats();
  loadStudents();

  // Search Listener: wait until the user stops typing before querying the server
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => loadStudents(0), 300);
    });
  }

  // Search Field Listener
  const searchField = document.getElementById("search-field");
  if (searchField) {
    searchField.addEventListener("change", () => {
      if (searchInput) searchInput.placeholder = SEARCH_PLACEHOLDERS[searchField.value];
      if (searchInput?.value.trim()) loadStudents(0);
    });
  }

  // Gender Filter Listener
  const genderFilter = document.getElementById("gender-filter");
  if (genderFilter) {
    genderFilter.addEventListener("change", () => loadStudents(0));
  }

  // Pagination Listeners
  document.getElementById("page-prev")?.addEventListener("click", () => loadStudents(currentPage - 1));
  document.getElementById("page-next")?.addEventListener("click", () => loadStudents(currentPage + 1));

  // View Toggle Listeners
  const gridBtn = document.getElementById("view-grid-btn");
  const tableBtn = document.getElementById("view-table-btn");

  if (gridBtn && tableBtn) {
    gridBtn.addEventListener("click", () => setViewMode("grid"));
    tableBtn.addEventListener("click", () => setViewMode("table"));
  }

  // Edit Form Submit Listener
  const editForm = document.getElementById("edit-student-form");
  if (editForm) {
    editForm.addEventListener("submit", handleUpdateStudent);
  }
}

/** Builds a /student/list URL from the given filters; empty filters are left out. */
function studentListUrl(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  return `${API_BASE_URL}/list?${params}`;
}

function currentFilters(page) {
  const field = document.getElementById("search-field")?.value || "name";
  const term = (document.getElementById("search-input")?.value || "").trim();
  const gender = document.getElementById("gender-filter")?.value || "all";
  return {
    [field]: term,
    gender: gender === "all" ? "" : gender,
    page,
    size: PAGE_SIZE
  };
}

async function loadStudents(page = currentPage) {
  const filters = currentFilters(page);
  // An id that is not a positive number cannot match anyone, so skip the request
  if (filters.id && !/^[1-9]\d*$/.test(filters.id)) {
    studentsList = [];
    totalPages = 0;
    renderStudents();
    return;
  }

  showSkeletons();
  try {
    const result = await apiRequest(studentListUrl(filters));
    // Deleting the last student on a page leaves it empty: step back a page
    if (result.items.length === 0 && result.page > 0) {
      return loadStudents(result.page - 1);
    }
    studentsList = result.items;
    currentPage = result.page;
    totalPages = result.totalPages;
    renderStudents();
  } catch (error) {
    console.error("Error fetching students:", error);
    showToast(error instanceof TypeError
      ? "Could not connect to backend server. Make sure Spring Boot is running on port 8080."
      : error.message, "error");
    studentsList = [];
    totalPages = 0;
    renderEmptyState();
  }
}

/** Overall counts for the stat cards, independent of the current search. */
async function loadStats() {
  const count = async (gender) => (await apiRequest(studentListUrl({ gender, size: 1 }))).totalItems;
  try {
    const [total, male, female] = await Promise.all([count(""), count("M"), count("F")]);
    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-male").textContent = male;
    document.getElementById("stat-female").textContent = female;
  } catch (error) {
    console.error("Error fetching stats:", error);
  }
}

function renderEmptyState() {
  const gridContainer = document.getElementById("students-grid");
  const emptyState = document.getElementById("empty-state");
  if (gridContainer) gridContainer.style.display = "none";
  if (document.getElementById("table-view-wrapper")) document.getElementById("table-view-wrapper").classList.remove("active");
  if (emptyState) emptyState.style.display = "block";
  renderPagination();
}

function renderPagination() {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  pagination.style.display = totalPages > 1 ? "flex" : "none";
  document.getElementById("page-info").textContent = `Page ${currentPage + 1} of ${totalPages}`;
  document.getElementById("page-prev").disabled = currentPage <= 0;
  document.getElementById("page-next").disabled = currentPage >= totalPages - 1;
}

function renderStudents() {
  const gridContainer = document.getElementById("students-grid");
  const tableContainer = document.getElementById("students-table-body");
  const emptyState = document.getElementById("empty-state");

  if (studentsList.length === 0) {
    renderEmptyState();
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  renderPagination();

  // Render Grid Cards
  if (gridContainer) {
    gridContainer.style.display = currentViewMode === "grid" ? "grid" : "none";
    gridContainer.innerHTML = studentsList.map((student) => `
      <div class="student-card">
        <div class="card-header">
          <div class="avatar-wrapper">
            <div class="student-avatar">${escapeHtml(getInitials(student.firstName, student.lastName))}</div>
            <div class="student-name-group">
              <h3>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</h3>
              <span class="student-id">ID: #${student.id}</span>
            </div>
          </div>
          ${genderBadge(student.gender)}
        </div>
        <div class="card-details">
          <div class="detail-item">
            <span class="detail-icon">🎂</span>
            <span>Age: <strong>${student.age} yrs</strong></span>
          </div>
          <div class="detail-item">
            <span class="detail-icon">🆔</span>
            <span>NIC: <strong>${escapeHtml(student.nic)}</strong></span>
          </div>
          <div class="detail-item">
            <span class="detail-icon">📍</span>
            <span>Address: <strong>${escapeHtml(student.address)}</strong></span>
          </div>
        </div>
        <div class="card-actions">
          <button onclick="viewStudentDetails(${student.id})" class="btn btn-secondary" style="flex:1;">
            👁️ Details
          </button>
          <button onclick="openEditModal(${student.id})" class="btn btn-edit btn-icon-only" title="Edit Student">
            ✏️
          </button>
          <button onclick="confirmDeleteStudent(${student.id})" class="btn btn-danger btn-icon-only" title="Delete Student">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  }

  // Render Table View
  if (tableContainer) {
    const wrapper = document.getElementById("table-view-wrapper");
    if (wrapper) wrapper.classList.toggle("active", currentViewMode === "table");

    tableContainer.innerHTML = studentsList.map((student) => `
      <tr>
        <td><strong>#${student.id}</strong></td>
        <td>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</td>
        <td>${genderBadge(student.gender)}</td>
        <td>${student.age}</td>
        <td><code>${escapeHtml(student.nic)}</code></td>
        <td>${escapeHtml(student.address)}</td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button onclick="viewStudentDetails(${student.id})" class="btn btn-secondary btn-icon-only" title="View">👁️</button>
            <button onclick="openEditModal(${student.id})" class="btn btn-edit btn-icon-only" title="Edit">✏️</button>
            <button onclick="confirmDeleteStudent(${student.id})" class="btn btn-danger btn-icon-only" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }
}

function setViewMode(mode) {
  currentViewMode = mode;
  document.getElementById("view-grid-btn")?.classList.toggle("active", mode === "grid");
  document.getElementById("view-table-btn")?.classList.toggle("active", mode === "table");
  renderStudents();
}

function showSkeletons() {
  const gridContainer = document.getElementById("students-grid");
  if (!gridContainer) return;
  gridContainer.style.display = "grid";
  gridContainer.innerHTML = Array(6).fill(0).map(() => `
    <div class="student-card skeleton" style="height: 220px;"></div>
  `).join('');
}

/* ==========================================
   MODAL ACTIONS (DETAILS, EDIT, DELETE)
   ========================================== */
async function viewStudentDetails(id) {
  try {
    const student = (await apiRequest(studentListUrl({ id }))).items[0];

    if (!student) {
      showToast("Student not found", "error");
      return;
    }

    const content = document.getElementById("details-modal-content");
    if (content) {
      content.innerHTML = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div class="student-avatar" style="width: 72px; height: 72px; font-size: 1.8rem; margin: 0 auto 0.75rem auto;">
            ${escapeHtml(getInitials(student.firstName, student.lastName))}
          </div>
          <h2 style="font-size: 1.5rem; font-weight: 700;">${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</h2>
          ${genderBadge(student.gender)}
        </div>
        <div style="background: rgba(10,13,20,0.5); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.8rem; border: 1px solid var(--glass-border);">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Student ID</span>
            <strong>#${student.id}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Age</span>
            <strong>${student.age} Years</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">National Identity (NIC)</span>
            <strong>${escapeHtml(student.nic)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Address</span>
            <strong>${escapeHtml(student.address)}</strong>
          </div>
        </div>
      `;
    }
    openModal("details-modal");
  } catch (err) {
    showToast(err.message || "Error loading student details", "error");
  }
}

function openEditModal(id) {
  const student = studentsList.find(s => s.id === id);
  if (!student) return;

  document.getElementById("edit-id").value = student.id;
  document.getElementById("edit-firstName").value = student.firstName || '';
  document.getElementById("edit-lastName").value = student.lastName || '';
  document.getElementById("edit-age").value = student.age || '';
  document.getElementById("edit-nic").value = student.nic || '';
  document.getElementById("edit-address").value = student.address || '';

  const genderRadios = document.getElementsByName("edit-gender");
  genderRadios.forEach(radio => {
    radio.checked = radio.value === student.gender;
  });

  openModal("edit-modal");
}

async function handleUpdateStudent(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById("edit-id").value, 10);
  const firstName = document.getElementById("edit-firstName").value.trim();
  const lastName = document.getElementById("edit-lastName").value.trim();
  const age = parseInt(document.getElementById("edit-age").value, 10);
  const nic = document.getElementById("edit-nic").value.trim();
  const address = document.getElementById("edit-address").value.trim();
  
  let gender = "M";
  const genderRadios = document.getElementsByName("edit-gender");
  genderRadios.forEach(r => { if (r.checked) gender = r.value; });

  if (!firstName || !lastName || !nic || !address || isNaN(age)) {
    showToast("Please fill in all required fields accurately", "error");
    return;
  }

  const updatedStudent = { id, firstName, lastName, gender, age, nic, address };

  try {
    await apiRequest(`${API_BASE_URL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedStudent)
    });

    showToast("Student details updated successfully!");
    closeModal("edit-modal");
    loadStats();
    loadStudents();
  } catch (err) {
    showToast(err.message || "Failed to update student", "error");
  }
}

function confirmDeleteStudent(id) {
  currentDeleteId = id;
  openModal("delete-modal");
}

async function executeDeleteStudent() {
  if (!currentDeleteId) return;

  try {
    await apiRequest(`${API_BASE_URL}/delete/${currentDeleteId}`, {
      method: "DELETE"
    });

    showToast("Student removed successfully");
    closeModal("delete-modal");
    currentDeleteId = null;
    loadStats();
    loadStudents();
  } catch (err) {
    showToast(err.message || "Failed to delete student", "error");
  }
}

/* ==========================================
   REGISTER PAGE LOGIC (registerForm.html)
   ========================================== */
function initRegisterPage() {
  const form = document.getElementById("student-register-form");
  if (form) {
    form.addEventListener("submit", handleRegisterStudent);
  }
}

async function handleRegisterStudent(e) {
  e.preventDefault();

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const age = parseInt(document.getElementById("age").value, 10);
  const nic = document.getElementById("nic").value.trim();
  const address = document.getElementById("address").value.trim();
  
  let gender = "M";
  const genderRadios = document.getElementsByName("gender");
  genderRadios.forEach(r => { if (r.checked) gender = r.value; });

  if (!firstName || !lastName || !nic || !address || isNaN(age)) {
    showToast("Please fill out all fields before registering", "error");
    return;
  }

  const newStudent = { firstName, lastName, gender, age, nic, address };
  const submitBtn = document.getElementById("btnReg");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Registering...";
  }

  try {
    await apiRequest(`${API_BASE_URL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStudent)
    });

    showToast("Student registered successfully! Redirecting...");
    formReset();

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
  } catch (err) {
    showToast(err instanceof TypeError
      ? "Failed to register student. Please check backend connection."
      : err.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "✨ Register Student";
    }
  }
}

function formReset() {
  document.getElementById("student-register-form")?.reset();
}

/* ==========================================
   HELPER UTILITIES
   ========================================== */

/**
 * Calls the API and returns the unwrapped `data`. On failure it throws with the
 * server's message, or the field messages of a validation error (422).
 */
async function apiRequest(url, options = {}) {
  const res = await authFetch(url, options);
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.success === false) {
    const fieldMessages = Object.values(body?.error?.fields || {});
    const message = fieldMessages.length ? fieldMessages.join(", ") : body?.message;
    throw new Error(message || `Request failed (${res.status})`);
  }
  return body?.data;
}

function genderBadge(gender) {
  const cssClass = gender === "F" ? "female" : "male";
  return `<span class="badge badge-gender-${cssClass}">${escapeHtml(GENDER_LABELS[gender] || "N/A")}</span>`;
}

function openModal(id) {
  document.getElementById(id)?.classList.add("active");
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("active");
}

function getInitials(first = "", last = "") {
  const f = first.charAt(0) || "";
  const l = last.charAt(0) || "";
  return (f + l).toUpperCase() || "ST";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
