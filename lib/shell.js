/**
 * Portal shell shared by the teacher and student pages: role check, user name,
 * sidebar tabs, mobile drawer and logout.
 *
 * Markup contract:
 *   .sidebar / .sidebar-backdrop / [data-drawer-toggle]   drawer
 *   button.nav-item[data-tab="x"]  <->  [data-panel="x"]  tabs
 *   [data-logout]                                         logout
 *   [data-user-name]                                      filled with the user's name
 */
import { logout, onSessionChange, requireRole } from "./api.js";
import { $, $$ } from "./dom.js";

function initDrawer() {
  const sidebar = $(".sidebar");
  const backdrop = $(".sidebar-backdrop");
  const toggle = $("[data-drawer-toggle]");

  const setOpen = (open) => {
    sidebar.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => setOpen(!sidebar.classList.contains("is-open")));
  backdrop.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => event.key === "Escape" && setOpen(false));
  return () => setOpen(false);
}

/**
 * @param {object} options
 * @param {"teacher"|"student"} options.role  the role allowed on this page
 * @param {Record<string, () => void>} options.onShow  called each time a tab is shown
 * @returns {Promise<{user: object, showTab: (name: string, ...args) => void} | null>}
 *   showTab passes any extra arguments on to that tab's onShow handler.
 */
export async function initPortal({ role, onShow = {} }) {
  const user = await requireRole(role);
  if (!user) return null;
  // Another tab switched account: reload so the role check runs again.
  onSessionChange(() => window.location.reload());

  $$("[data-user-name]").forEach((element) => (element.textContent = user.name));
  const closeDrawer = initDrawer();
  const tabs = $$(".nav-item[data-tab]");

  const showTab = (name, ...args) => {
    for (const tab of tabs) {
      if (tab.dataset.tab === name) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    }
    for (const panel of $$("[data-panel]")) panel.hidden = panel.dataset.panel !== name;
    closeDrawer();
    onShow[name]?.(...args);
  };

  tabs.forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));
  $("[data-logout]").addEventListener("click", logout);
  return { user, showTab };
}
