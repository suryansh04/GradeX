import { passwordStrength } from "../node_modules/check-password-strength/dist/index.mjs";
import { apiRequest } from "../lib/api.js";
import { initAuthForm } from "../lib/auth-form.js";

const MIN_PASSWORD_LENGTH = 8;

// Password strength meter: check-password-strength's ids 0-3 fill 1-4 bars.
const passwordInput = document.getElementById("password");
const meter = document.getElementById("strength-meter");
const meterLabel = document.getElementById("strength-label");

passwordInput.addEventListener("input", () => {
  const password = passwordInput.value;
  if (!password) {
    meter.dataset.level = "0";
    meterLabel.textContent = "";
    return;
  }
  const strength = passwordStrength(password);
  meter.dataset.level = String(strength.id + 1);
  meterLabel.textContent = `Strength: ${strength.value}`;
});

initAuthForm({
  form: document.getElementById("signup-form"),
  async submit({ name, email, password, role }) {
    if (!name || !email || !password || !role) {
      throw new Error("Please fill in all fields and choose Teacher or Student.");
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    await apiRequest("/auth/signup", { method: "POST", json: { name, email, password, role } });
    window.location.href = "../login/login.html?registered";
  },
});
