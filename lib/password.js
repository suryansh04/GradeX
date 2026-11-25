/** Show/hide buttons for password fields: <div class="password-wrap"> with an input and a button. */
export function initPasswordToggles(root = document) {
  for (const wrap of root.querySelectorAll(".password-wrap")) {
    const input = wrap.querySelector("input");
    const button = wrap.querySelector("button");
    const icon = button.querySelector("i");

    button.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      icon.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      button.setAttribute("aria-pressed", String(show));
    });
  }
}
