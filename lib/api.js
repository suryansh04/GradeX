import { API_BASE_URL } from "./config.js";

const TOKEN_STORAGE_KEY = "gradex.accessToken";
const LOGIN_PAGE = "../login/login.html";

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

/**
 * Calls the GradeX API. Pass `json` for a JSON body or `formData` for uploads.
 * Throws ApiError with the server's message when the response is not OK.
 */
export async function apiRequest(path, { method = "GET", json, formData } = {}) {
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

  const response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body });
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
