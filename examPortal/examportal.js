var loader = document.querySelector(".loader");
var overlay = document.querySelector(".overlay");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
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

let currentExam;
let currentQuestionIndex = 0;

// Function to get URL parameters
function getUrlParameter(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

// Function to fetch exam data
async function fetchExamData(examId) {
  showSpinner();
  hideQuestionContent();
  try {
    const examDoc = await getDoc(doc(db, "exams", examId));
    if (examDoc.exists()) {
      currentExam = examDoc.data();
      displayQuestion(currentQuestionIndex);
      showQuestionContent();
    } else {
      console.log("No such exam!");
    }
  } catch (error) {
    console.error("Error fetching exam:", error);
  } finally {
    hideSpinner();
  }
}

// Function to display a question

function displayQuestion(index) {
  if (index >= currentExam.questions.length) {
    alert("You've reached the end of the exam!");
    return;
  }

  const question = currentExam.questions[index];
  document.querySelector(".question-number").textContent = `Q${index + 1}.`;
  document.querySelector(".question").textContent = question.questionText;
  document.querySelector("textarea").value = "";

  // Handle image display
  const imageContainer = document.getElementById("questionImage");
  if (question.imageUrl) {
    imageContainer.querySelector("img").src = question.imageUrl;
    imageContainer.classList.remove("hidden");
  } else {
    imageContainer.classList.add("hidden");
  }

  const nextButton = document.querySelector(".next-btn button");
  if (index === currentExam.questions.length - 1) {
    nextButton.textContent = "Finish Exam";
  } else {
    nextButton.textContent = "Next Question";
  }
}

// Event listener for next button
document.querySelector(".next-btn button").addEventListener("click", () => {
  currentQuestionIndex++;
  displayQuestion(currentQuestionIndex);
});

// Initialize exam when page loads
document.addEventListener("DOMContentLoaded", () => {
  const examId = getUrlParameter("examId");
  if (examId) {
    fetchExamData(examId);
  } else {
    console.error("No exam ID provided in URL");
  }

  // Update student name
  const studentName = getUrlParameter("name");
  document.querySelector(
    ".greeting-name p"
  ).textContent = `Hey ${studentName} ,`;
});

// ------------------------------------------------------------------------------------------------------------------------------------------

// Loader

/** Spinner Function */

function showSpinner() {
  loader.style.display = "block";
  overlay.style.display = "block";
}

function hideSpinner() {
  loader.style.display = "none";
  overlay.style.display = "none";
}

// -------------------------------------------------------------------
function showQuestionContent() {
  document.getElementById("questionContent").classList.remove("hidden");
}

function hideQuestionContent() {
  document.getElementById("questionContent").classList.add("hidden");
}
