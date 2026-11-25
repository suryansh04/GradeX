/** Small DOM helpers shared by every page. */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

/** Marks markup as already safe, so `html` inserts it unescaped. */
export const raw = (markup) => new SafeHtml(markup);

function render(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  if (value === false || value === null || value === undefined) return "";
  return escapeHtml(value);
}

/**
 * Template tag for building markup. Every interpolated value is escaped unless it
 * comes from `html` or `raw`; arrays are joined, and false/null/undefined render
 * nothing, so `${cond && html`...`}` works.
 */
export function html(strings, ...values) {
  return raw(strings.reduce((out, string, i) => out + string + (i < values.length ? render(values[i]) : ""), ""));
}

/** Closes a <dialog> when any element inside it marked [data-close] is clicked. */
export function closeOnDataClose(dialog) {
  dialog.addEventListener("click", (event) => event.target.closest("[data-close]") && dialog.close());
}

/** Replaces an element's children with markup built by `html` (or an array of it). */
export function setHtml(element, markup) {
  element.innerHTML = render(markup);
}
