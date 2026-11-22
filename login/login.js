var seeIcon = document.querySelector(".see-icon");
var unSeeIcon = document.querySelector(".unsee-icon");
var passwordInput = document.querySelector(".passwordInputType");
var loader = document.querySelector(".loader");
var overlay = document.querySelector(".overlay");
// --------------------------------------------------------------------------

// Toggle Eye icon in the password Implementation

seeIcon.addEventListener("click", () => {
  seeIcon.classList.add("unshow");
  unSeeIcon.classList.remove("unshow");
  passwordInput.type = "text";
});

unSeeIcon.addEventListener("click", () => {
  unSeeIcon.classList.add("unshow");
  seeIcon.classList.remove("unshow");
  passwordInput.type = "password";
});

/** Spinner Function */
function showSpinner() {
  loader.style.display = "block";
  overlay.style.display = "block";
}

function hideSpinner() {
  loader.style.display = "none";
  overlay.style.display = "none";
}

//-----------------------------------------------------------------------------

// GradeX API

import { apiRequest, setAccessToken } from "../lib/api.js";

// Login functionality
const form = document.querySelector("form");
const emailInput = document.getElementById("email");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }
  showSpinner();
  try {
    const { access_token, user } = await apiRequest("/auth/login", {
      method: "POST",
      json: { email, password },
    });
    setAccessToken(access_token);

    const encodedName = encodeURIComponent(user.name);

    hideSpinner();
    if (user.role === "teacher") {
      window.location.href = `../TeacherPortal/teacher.html?name=${encodedName}`;
    } else if (user.role === "student") {
      window.location.href = `../studentPortal/studentportal.html?name=${encodedName}`;
    } else {
      console.error("Unknown role:", user.role);
      alert("Login successful, but role is unknown. Please contact support.");
    }
  } catch (error) {
    console.error("Error:", error);
    hideSpinner();
    alert("Login failed. " + error.message);
  }
});
