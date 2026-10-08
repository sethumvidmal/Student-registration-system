/**
 * EduManage - sign-in page (login.html).
 */

document.addEventListener("DOMContentLoaded", () => {
  if (getSession()) {
    window.location.replace(HOME_PAGE);
    return;
  }

  const form = $("#login-form");
  const identifier = $("#emailOrPhone");
  const password = $("#password");
  const toggle = $("#toggle-password");
  const capsHint = $("#caps-hint");
  const errorBox = $("#login-error");
  const submit = $("#btn-login");

  const showError = (message) => {
    errorBox.innerHTML = `${icon("alert-circle", { size: 16 })}<span>${escapeHtml(message)}</span>`;
    errorBox.hidden = false;
  };

  toggle.addEventListener("click", () => {
    const show = password.type === "password";
    password.type = show ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(show));
    toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    toggle.innerHTML = icon(show ? "eye-off" : "eye", { size: 16 });
    password.focus();
  });

  const checkCapsLock = (event) => {
    if (event.getModifierState) capsHint.hidden = !event.getModifierState("CapsLock");
  };
  password.addEventListener("keydown", checkCapsLock);
  password.addEventListener("keyup", checkCapsLock);
  password.addEventListener("blur", () => { capsHint.hidden = true; });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.hidden = true;

    if (!identifier.value.trim() || !password.value) {
      showError("Enter your email or phone number and your password.");
      (identifier.value.trim() ? password : identifier).focus();
      return;
    }

    setLoading(submit, true);
    try {
      await login(identifier.value.trim(), password.value);
      window.location.replace(HOME_PAGE);
    } catch (error) {
      setLoading(submit, false);
      showError(error instanceof TypeError
        ? "Can't reach the server. Make sure the backend is running on port 8080."
        : error.message);
      password.select();
    }
  });
});
