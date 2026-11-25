/** Loading overlay and toast messages. */

let overlay;
let pending = 0;

function loaderOverlay() {
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "loader-overlay";
    overlay.hidden = true;
    overlay.innerHTML = '<div class="loader" role="status" aria-label="Loading"></div>';
    document.body.append(overlay);
  }
  return overlay;
}

/** Shows the loading overlay while `task` runs. Nested calls share one overlay. */
export async function withLoader(task) {
  pending += 1;
  loaderOverlay().hidden = false;
  try {
    return await task();
  } finally {
    pending -= 1;
    if (pending === 0) loaderOverlay().hidden = true;
  }
}

let toastRegion;

/** Shows a short message. `type` is "info", "success" or "error". */
export function showToast(message, type = "info", durationMs = 4500) {
  if (!toastRegion) {
    toastRegion = document.createElement("div");
    toastRegion.className = "toast-region";
    toastRegion.setAttribute("aria-live", "polite");
    document.body.append(toastRegion);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.textContent = message;
  toastRegion.append(toast);
  setTimeout(() => toast.remove(), durationMs);
}
