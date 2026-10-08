/**
 * EduManage - register student page (registerForm.html).
 * Client-side validation that mirrors the API, inline server errors,
 * and a live preview of the student card.
 */

const REQUIRED_FIELDS = ["firstName", "lastName", "gender", "age", "nic", "address"];

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "register") initRegisterPage();
});

function initRegisterPage() {
  const form = $("#register-form");
  bindErrorClearing(form);
  form.addEventListener("input", () => updatePreview(form));
  form.addEventListener("change", () => updatePreview(form));
  form.addEventListener("submit", submitRegistration);
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  $("#mod-key").textContent = MOD_KEY;
  updatePreview(form);
  $("#firstName").focus();
}

function updatePreview(form) {
  const values = readStudentForm(form);
  const name = fullName(values);
  const placeholder = (text) => `<span class="placeholder">${text}</span>`;

  $("#preview-avatar").outerHTML = avatarHtml(values, "lg").replace("<span", '<span id="preview-avatar"');
  $("#preview-name").innerHTML = name ? escapeHtml(name) : placeholder("Student name");
  $("#preview-badge").innerHTML = genderBadge(values.gender);
  $("#preview-age").innerHTML = values.age ? `${escapeHtml(values.age)} years` : placeholder("Age");
  $("#preview-nic").innerHTML = values.nic ? escapeHtml(values.nic) : placeholder("NIC number");
  $("#preview-address").innerHTML = values.address ? escapeHtml(values.address) : placeholder("Address");

  const complete = REQUIRED_FIELDS.filter((field) => values[field]).length;
  $("#completeness-count").textContent = `${complete} of ${REQUIRED_FIELDS.length}`;
  $("#completeness-bar").style.width = `${(complete / REQUIRED_FIELDS.length) * 100}%`;
}

async function submitRegistration(event) {
  event.preventDefault();
  const form = event.target;
  const values = readStudentForm(form);
  const errors = validateStudent(values);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    return;
  }

  const button = $("#register-submit");
  setLoading(button, true);
  try {
    const saved = await saveStudent(toStudentPayload(values));
    // The directory opens the new student's profile and confirms the registration
    location.href = `index.html?view=${saved.id}&created=1`;
  } catch (error) {
    setLoading(button, false);
    if (!applyServerErrors(form, error)) toast(error.message, { type: "error", title: "Couldn't register student" });
  }
}
