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

// Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
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
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Get user role from Firestore

    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const role = userData.role;
      const name = userData.name;
      const encodedName = encodeURIComponent(name);

      hideSpinner();
      if (role === "teacher") {
        window.location.href = `../TeacherPortal/teacher.html?name=${encodedName}`;
      } else if (role === "student") {
        window.location.href = `../studentPortal/studentportal.html?name=${encodedName}`;
      } else {
        console.error("Unknown role:", role);
        alert("Login successful, but role is unknown. Please contact support.");
      }
    } else {
      console.error("User document does not exist");
      hideSpinner();
      alert(
        "Login successful, but user data is missing. Please contact support."
      );
    }
  } catch (error) {
    console.error("Error:", error);
    hideSpinner();
    alert("Login failed. " + error.message);
  }
});
