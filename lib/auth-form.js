/** Behaviour shared by the login and sign-up forms. */
import { withLoader } from "./feedback.js";
import { initPasswordToggles } from "./password.js";

/**
 * Wires a form: password toggles, an inline error message (#form-error), and a
 * loader while `submit` runs. `submit` receives the trimmed field values; any
 * error it throws is shown to the user.
 */
export function initAuthForm({ form, submit }) {
  const errorBox = form.querySelector("#form-error");
  const submitButton = form.querySelector('[type="submit"]');
  initPasswordToggles(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.hidden = true;

    const values = Object.fromEntries(
      [...new FormData(form)].map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
    );

    submitButton.disabled = true;
    try {
      await withLoader(() => submit(values));
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    } finally {
      submitButton.disabled = false;
    }
  });
}
