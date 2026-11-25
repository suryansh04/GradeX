import { apiRequest, portalUrl, setAccessToken } from "../lib/api.js";
import { initAuthForm } from "../lib/auth-form.js";
import { showToast } from "../lib/feedback.js";

if (new URLSearchParams(location.search).has("registered")) {
  showToast("Account created. Log in to continue.", "success");
}

initAuthForm({
  form: document.getElementById("login-form"),
  async submit({ email, password }) {
    if (!email || !password) throw new Error("Please enter both email and password.");

    const { access_token, user } = await apiRequest("/auth/login", {
      method: "POST",
      json: { email, password },
    });
    setAccessToken(access_token);
    window.location.href = portalUrl(user.role);
  },
});
