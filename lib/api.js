import { API_BASE_URL } from "./config.js";

const TOKEN_STORAGE_KEY = "gradex.accessToken";
const LOGIN_PAGE = "../login/login.html";
const PORTAL_PAGES = {
  teacher: "../TeacherPortal/teacher.html",
  student: "../studentPortal/studentportal.html",
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function setAccessToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** The home page for a role, relative to any page folder. */
export function portalUrl(role) {
  return PORTAL_PAGES[role];
}

/**
 * Calls the GradeX API. Pass `json` for a JSON body or `formData` for uploads.
 * Throws ApiError with the server's message when the response is not OK.
 */
export async function apiRequest(path, { method = "GET", json, formData, keepalive = false } = {}) {
  const headers = {};
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (formData !== undefined) {
    body = formData;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body, keepalive });
  } catch {
    throw new ApiError("Can't reach the GradeX server. Check your connection and try again.", 0);
  }
  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  return response.status === 204 ? null : response.json();
}

async function readErrorMessage(response) {
  try {
    const { detail } = await response.json();
    if (typeof detail === "string") return detail;
    // FastAPI validation errors: [{ loc, msg, ... }]
    if (Array.isArray(detail)) return detail.map((error) => error.msg).join(" ");
  } catch {
    // The body was not JSON; fall through to the generic message.
  }
  return `Request failed with status ${response.status}.`;
}

/** Returns the signed-in user, or redirects to the login page if there is none. */
export async function requireSession() {
  try {
    return await apiRequest("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAccessToken();
      window.location.href = LOGIN_PAGE;
      return null;
    }
    throw error;
  }
}

/** Like requireSession, but sends users with another role to their own portal. */
export async function requireRole(role) {
  const user = await requireSession();
  if (user && user.role !== role) {
    window.location.href = portalUrl(user.role);
    return null;
  }
  return user;
}

export function logout() {
  clearAccessToken();
  window.location.href = LOGIN_PAGE;
}
