/** Formatting for durations, marks, dates and countdowns. */

export function formatDuration(minutes) {
  if (!minutes) return "No time limit";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** 4 -> "4", 2.5 -> "2.5", 3.333 -> "3.33" */
export function formatMarks(value) {
  return String(Math.round(value * 100) / 100);
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function formatDateTime(iso) {
  return dateTime.format(new Date(iso));
}

/** Milliseconds -> "mm:ss", or "h:mm:ss" from an hour up. */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
