import { passwordStrength } from "../node_modules/check-password-strength/dist/index.mjs";

var seeIcon = document.querySelector(".see-icon");
var unSeeIcon = document.querySelector(".unsee-icon");
var passwordInput = document.querySelector(".passwordInputType");
var loader = document.querySelector(".loader");
var overlay = document.querySelector(".overlay");
// Password Strength Meter Implementation
var tooweak = document.querySelector(".too-weak");
var weak = document.querySelector(".weak");
var medium = document.querySelector(".medium");
var strong = document.querySelector(".strong");

passwordInput.addEventListener("input", () => {
  var passwordValue = passwordInput.value;
  var passwordStrengthValue = passwordStrength(passwordValue).value;
  console.log(passwordStrengthValue);
  if (passwordValue.length === 0) {
    var strength = document.querySelectorAll(".strength");
    for (var i = 0; i < strength.length; i++) {
      strength[i].style.backgroundColor = "transparent";
    }
  } else {
    if (passwordStrengthValue === "Too weak") {
      weak.style.backgroundColor = "transparent";
      strong.style.backgroundColor = "transparent";
      medium.style.backgroundColor = "transparent";
      tooweak.style.backgroundColor = "#FF4136";
    } else if (passwordStrengthValue === "Weak") {
      strong.style.backgroundColor = "transparent";
      medium.style.backgroundColor = "transparent";
      weak.style.backgroundColor = "#FF851B";
    } else if (passwordStrengthValue === "Medium") {
      strong.style.backgroundColor = "transparent";
      medium.style.backgroundColor = "#FFDC00";
    } else if (passwordStrengthValue == "Strong") {
      strong.style.backgroundColor = "#2ECC40";
      medium.style.backgroundColor = "#FFDC00";
    }
  }
});

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

//Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCNGXg9EyuhaM86YiaGFAFrMNqr9yEKkzY",
  authDomain: "gradex-final.firebaseapp.com",
  projectId: "gradex-final",
  storageBucket: "gradex-final.appspot.com",
  messagingSenderId: "917505988467",
  appId: "1:917505988467:web:3fd4117e9693f64b369706",
  measurementId: "G-9ENX8ES9LF",
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = getAuth(app);

export { db, auth };
const form = document.querySelector("form");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const roleInputs = document.querySelectorAll('input[name="role"]');

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value;
  const email = emailInput.value;
  const password = passwordInput.value;
  const role = [...roleInputs].find((input) => input.checked)?.value;

  if (!name || !email || !password || !role) {
    alert("Please fill in all fields and select a role.");
    return;
  }
  showSpinner();
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Add user details to Firestore
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      role: role,
    });
    hideSpinner();
    window.location.href = "../login/login.html";
    form.reset();
  } catch (error) {
    console.error("Error:", error);
    hideSpinner();
    alert("Signup failed. " + error.message);
  }
});
