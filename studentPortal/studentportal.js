var hamburger = document.querySelector(".hamburger");
var sidebar = document.querySelector(".sidebar");
var examBtnSideBar = document.querySelector(".exam");
var examBtnIcon = document.querySelector(".exam i");
var examBtnLink = document.querySelector(".exam a");
var resultBtnSideBar = document.querySelector(".result");
var resultBtnIcon = document.querySelector(".result i");
var resultBtnLink = document.querySelector(".result a");
var examContent = document.querySelector(".exam-content");
var resultContent = document.getElementById("result-content");
var mainContent = document.querySelector(".main-content");

// Hamburger Menu

hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("active");
});

/* Sidebar(left side ) toggling */

examBtnSideBar.addEventListener("click", () => {
  if (
    examBtnIcon.classList.contains("selected") === false &&
    examBtnLink.classList.contains("selected") === false
  ) {
    examBtnIcon.classList.add("selected");
    examBtnLink.classList.add("selected");

    resultBtnIcon.classList.remove("selected");
    resultBtnLink.classList.remove("selected");

    examContent.style.display = "block";
    resultContent.style.display = "none";
    mainContent.style.paddingRight = "30px";
  }
});

resultBtnSideBar.addEventListener("click", () => {
  if (
    resultBtnIcon.classList.contains("selected") === false &&
    resultBtnLink.classList.contains("selected") === false
  ) {
    resultBtnIcon.classList.add("selected");
    resultBtnLink.classList.add("selected");

    examBtnIcon.classList.remove("selected");
    examBtnLink.classList.remove("selected");

    examContent.style.display = "none";
    resultContent.style.display = "flex";
    resultContent.style.justifyContent = "space-between";
    mainContent.style.paddingRight = "0px";
  }
});

// -------------------------------------------------------------------------------------------------------------------------------------------------------

// Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  collection,
  getDocs,
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
const auth = getAuth(app);
const db = getFirestore(app);

// Function to get URL parameters
function getUrlParameter(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

// Function to update the user name in the header
function updateUserName(name) {
  const userNameElement = document.querySelector(".username");
  if (userNameElement) {
    userNameElement.textContent = name || "Student";
  }
}

// Immediately update the user name when the page loads
document.addEventListener("DOMContentLoaded", () => {
  const name = getUrlParameter("name");
  updateUserName(name);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User is signed in");
  } else {
    console.log("User is signed out");
    window.location.href = "../login/login.html";
  }
});

// ----------------------------------------------------------------------------------------------------------------------------------------
/// Fetching exam data from the firebase (collection - exams)

// Function to fetch and display exams

async function fetchAndDisplayExams() {
  try {
    const examsCollection = collection(db, "exams");
    const querySnapshot = await getDocs(examsCollection);
    const examList = document.querySelector(".exam-list");

    querySnapshot.forEach((doc) => {
      const examData = doc.data();
      const examElement = createExamElement(examData, doc.id);
      examList.appendChild(examElement);
    });
  } catch (error) {
    console.error("Error fetching exams: ", error);
  }
}

// Function to create exam element

function createExamElement(examData, examId) {
  const examInfoContainer = document.createElement("div");
  examInfoContainer.className = "exam-info-container";
  examInfoContainer.innerHTML = `
    <div class="exam-main-info-container">
      <div class="course-code-container">
        <p class="course-code">${examData.courseCode}</p>
      </div>
      <div class="exam-name-container">
        <p>${examData.examName}</p>
      </div>
    </div>
    <div class="exam-start-btn-container">
      <button class="start-btn" data-exam-id="${examId}">Start</button>
    </div>
  `;

  const startBtn = examInfoContainer.querySelector(".start-btn");
  startBtn.addEventListener("click", () => startExam(examId));

  return examInfoContainer;
}

// Function to handle exam start
function startExam(examId) {
  console.log(`Starting exam with ID: ${examId}`);
  // Implement your exam start logic here

  // For example, you might want to navigate to a new page or show the exam questions

  const studentName = document.querySelector(".username").textContent;
  window.location.href = `../examPortal/examportal.html?examId=${examId}&name=${encodeURIComponent(
    studentName
  )}`;
}

// Event listener for when the DOM is loaded

document.addEventListener("DOMContentLoaded", () => {
  const name = getUrlParameter("name");
  updateUserName(name);
  fetchAndDisplayExams();
});
