/**
 * EduManage - authentication.
 * Stores the JWT session, attaches it to API calls, refreshes it when the
 * access token expires and redirects to the login page when it ends.
 * Load this before ui.js on every page.
 */

const AUTH_API_URL = "http://localhost:8080/auth";
const SESSION_KEY = "edumanage.session";
const LOGIN_PAGE = "login.html";
const HOME_PAGE = "index.html";

const isLoginPage = window.location.pathname.endsWith(LOGIN_PAGE);

// Guard protected pages before they render
if (!isLoginPage && !getSession()) {
  window.location.replace(LOGIN_PAGE);
}

/* ==========================================
   SESSION STORAGE
   ========================================== */
function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch (error) {
    return null;
  }
}

function saveSession({ accessToken, refreshToken, user }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken, refreshToken, user }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function redirectToLogin() {
  clearSession();
  window.location.replace(LOGIN_PAGE);
}

/* ==========================================
   LOGIN / LOGOUT / REFRESH
   ========================================== */
async function login(emailOrPhone, password) {
  const res = await fetch(`${AUTH_API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailOrPhone, password })
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || "Login failed");

  saveSession(body.data);
  return body.data.user;
}

async function logout() {
  try {
    await authFetch(`${AUTH_API_URL}/logout`, { method: "POST" });
  } catch (error) {
    // Server unreachable: still end the session locally
    console.error("Logout request failed:", error);
  }
  redirectToLogin();
}

async function refreshSession() {
  const session = getSession();
  if (!session?.refreshToken) return false;

  const res = await fetch(`${AUTH_API_URL}/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken })
  });
  if (!res.ok) return false;

  const body = await res.json();
  saveSession(body.data);
  return true;
}

// Refresh tokens are single-use, so concurrent 401s must share one refresh call
let refreshInFlight = null;

/**
 * fetch() with the Bearer token attached. On 401 it refreshes the session
 * once and retries; if that fails the user is sent to the login page.
 */
async function authFetch(url, options = {}) {
  const send = () => {
    const headers = new Headers(options.headers || {});
    const session = getSession();
    if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
    return fetch(url, { ...options, headers });
  };

  let res = await send();
  if (res.status !== 401) return res;

  refreshInFlight = refreshInFlight || refreshSession().finally(() => { refreshInFlight = null; });
  if (await refreshInFlight) {
    res = await send();
  }

  if (res.status === 401) redirectToLogin();
  return res;
}
