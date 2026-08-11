/**
 * Student Registration System - Frontend App Logic
 * Backend URL: http://localhost:8080/student
 */

const API_BASE_URL = "http://localhost:8080/student";

// Global State
let studentsList = [];
let filteredStudents = [];
let currentViewMode = "grid"; // 'grid' or 'table'
let currentDeleteId = null;

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
  loadStudents();

  // Search Listener
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      filterStudents();
    });
  }

  // Gender Filter Listener
  const genderFilter = document.getElementById("gender-filter");
  if (genderFilter) {
    genderFilter.addEventListener("change", () => {
      filterStudents();
    });
  }

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

async function loadStudents() {
  showSkeletons();
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) throw new Error("Failed to fetch students");
    const data = await response.json();
    studentsList = Array.isArray(data) ? data : [];
    filterStudents();
  } catch (error) {
    console.error("Error fetching students:", error);
    showToast("Could not connect to backend server. Make sure Spring Boot is running on port 8080.", "error");
    renderEmptyState();
  }
}

function renderEmptyState() {
  const gridContainer = document.getElementById("students-grid");
  const emptyState = document.getElementById("empty-state");
  if (gridContainer) gridContainer.style.display = "none";
  if (document.getElementById("table-view-wrapper")) document.getElementById("table-view-wrapper").classList.remove("active");
  if (emptyState) emptyState.style.display = "block";
}

function filterStudents() {
  const searchTerm = (document.getElementById("search-input")?.value || "").toLowerCase().trim();
  const selectedGender = document.getElementById("gender-filter")?.value || "all";

  filteredStudents = studentsList.filter((student) => {
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
    const nic = (student.nic || '').toLowerCase();
    const address = (student.address || '').toLowerCase();
    
    const matchesSearch = fullName.includes(searchTerm) || nic.includes(searchTerm) || address.includes(searchTerm);
    const matchesGender = selectedGender === "all" || (student.gender || '').toLowerCase() === selectedGender.toLowerCase();

    return matchesSearch && matchesGender;
  });

  updateStats();
  renderStudents();
}

function updateStats() {
  const totalEl = document.getElementById("stat-total");
  const maleEl = document.getElementById("stat-male");
  const femaleEl = document.getElementById("stat-female");

  if (totalEl) totalEl.textContent = studentsList.length;
  if (maleEl) maleEl.textContent = studentsList.filter(s => (s.gender || '').toLowerCase() === 'male').length;
  if (femaleEl) femaleEl.textContent = studentsList.filter(s => (s.gender || '').toLowerCase() === 'female').length;
}

function renderStudents() {
  const gridContainer = document.getElementById("students-grid");
  const tableContainer = document.getElementById("students-table-body");
  const emptyState = document.getElementById("empty-state");

  if (filteredStudents.length === 0) {
    renderEmptyState();
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  // Render Grid Cards
  if (gridContainer) {
    gridContainer.style.display = currentViewMode === "grid" ? "grid" : "none";
    gridContainer.innerHTML = filteredStudents.map((student) => `
      <div class="student-card">
        <div class="card-header">
          <div class="avatar-wrapper">
            <div class="student-avatar">${escapeHtml(getInitials(student.firstName, student.lastName))}</div>
            <div class="student-name-group">
              <h3>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</h3>
              <span class="student-id">ID: #${student.id}</span>
            </div>
          </div>
          <span class="badge badge-gender-${(student.gender || 'male').toLowerCase()}">${escapeHtml(student.gender || 'N/A')}</span>
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

    tableContainer.innerHTML = filteredStudents.map((student) => `
      <tr>
        <td><strong>#${student.id}</strong></td>
        <td>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</td>
        <td><span class="badge badge-gender-${(student.gender || 'male').toLowerCase()}">${escapeHtml(student.gender || 'N/A')}</span></td>
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
    const res = await fetch(`${API_BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Could not fetch details");
    const data = await res.json();
    const student = Array.isArray(data) ? data[0] : data;

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
          <span class="badge badge-gender-${(student.gender || 'male').toLowerCase()}">${escapeHtml(student.gender)}</span>
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
    showToast("Error loading student details", "error");
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
    radio.checked = (radio.value.toLowerCase() === (student.gender || '').toLowerCase());
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
  
  let gender = "Male";
  const genderRadios = document.getElementsByName("edit-gender");
  genderRadios.forEach(r => { if (r.checked) gender = r.value; });

  if (!firstName || !lastName || !nic || !address || isNaN(age)) {
    showToast("Please fill in all required fields accurately", "error");
    return;
  }

  const updatedStudent = { id, firstName, lastName, gender, age, nic, address };

  try {
    const res = await fetch(API_BASE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedStudent)
    });

    if (!res.ok) throw new Error("Update failed");

    showToast("Student details updated successfully!");
    closeModal("edit-modal");
    loadStudents();
  } catch (err) {
    showToast("Failed to update student", "error");
  }
}

function confirmDeleteStudent(id) {
  currentDeleteId = id;
  openModal("delete-modal");
}

async function executeDeleteStudent() {
  if (!currentDeleteId) return;

  try {
    const res = await fetch(`${API_BASE_URL}/${currentDeleteId}`, {
      method: "DELETE"
    });

    if (!res.ok) throw new Error("Delete failed");

    showToast("Student removed successfully");
    closeModal("delete-modal");
    currentDeleteId = null;
    loadStudents();
  } catch (err) {
    showToast("Failed to delete student", "error");
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
  
  let gender = "Male";
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
    const res = await fetch(API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStudent)
    });

    if (!res.ok) throw new Error("Registration failed");

    showToast("Student registered successfully! Redirecting...");
    formReset();

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
  } catch (err) {
    showToast("Failed to register student. Please check backend connection.", "error");
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
