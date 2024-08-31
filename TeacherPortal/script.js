var hamburger = document.querySelector(".hamburger");
var sidebar = document.querySelector(".sidebar");
var popup = document.querySelector("#popup");
var successPopUp = document.getElementById("success-popup-container");
var successPopClosebtn = document.querySelector(".close-btn i");
var cancelBtn = document.querySelector("#cancelBtn");
var submitBtn = document.querySelector("#submitBtn");
var newQuestionBtn = document.querySelector(".new-question-btn");
var initialMarksInput = document.querySelector(".marks");
var totalMarks = document.querySelector("span.total-marks");
var createBtnSideBar = document.querySelector(".create");

var createBtnIcon = document.querySelector(".create i");
var createBtnLink = document.querySelector(".create a");

var analyticsBtnSideBar = document.querySelector(".analytics");
var analyticsBtnIcon = document.querySelector(".analytics i");
var analyticsBtnLink = document.querySelector(".analytics a");

var createContent = document.querySelector(".create-content");
var analyticsContent = document.getElementById("analytics-content");

var questionNumber = 1;

// Function to update the total marks

function updateTotalMarks() {
  var marksInput = document.querySelectorAll(".marks");
  var total = 0;
  marksInput.forEach(function (input) {
    var markValue = parseFloat(input.value) || 0;
    total += markValue;
  });

  totalMarks.textContent = total;
}

function addMarkInputListener(markInput) {
  markInput.addEventListener("input", updateTotalMarks);
}

hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("active");
});

// Pop up Functionality

window.addEventListener("load", () => {
  popup.style.display = "flex";
  addMarkInputListener(initialMarksInput);
  createContent.style.display = "block";
  analyticsContent.style.display = "none";
});

cancelBtn.addEventListener("click", () => {
  popup.style.display = "none";
});

submitBtn.addEventListener("click", () => {
  var courseCode = document.querySelector("#courseCode").value;
  var examName = document.querySelector("#examName").value;
  console.log(courseCode);
  console.log(examName);
  popup.style.display = "none";
});

//Success Pop close Btn
successPopClosebtn.addEventListener("click", () => {
  console.log("Clicked");
  successPopUp.style.display = "none";
});

// Adding Question container on clicking new question button

newQuestionBtn.addEventListener("click", () => {
  questionNumber++;

  var newMainBorder = document.createElement("div");
  newMainBorder.className = "main-border new-question-container";
  newMainBorder.style.marginTop = "20px";

  newMainBorder.innerHTML = `
    <div class="question-marks-container">
      <div class="question-container">
        <p class="question-number">Q<span class="q-num">${questionNumber}.</span></p>
        <input
          type="text"
          placeholder="State newton third law?"
          class="question-text"
        />
      </div>
      <div class="marks-container">
        <p>Marks</p>
        <input type="text" class="marks" />
      </div>
    </div>
    <div class="add-image-container">
      <label for="imageUpload${questionNumber}" class="add-image-btn">
        <i class="fa-regular fa-image add-image-logo"></i>Add an Image
      </label>
      <input type="file" id="imageUpload${questionNumber}" accept="image/*" style="display: none;">
    </div>`;

  var footerContainer = document.querySelector(".footer-container");
  createContent.insertBefore(newMainBorder, footerContainer);
  var newMarkInput = newMainBorder.querySelector(".marks");
  addMarkInputListener(newMarkInput);
});

createBtnSideBar.addEventListener("click", () => {
  if (
    createBtnIcon.classList.contains("selected") === false &&
    createBtnLink.classList.contains("selected") === false
  ) {
    createBtnIcon.classList.add("selected");
    createBtnLink.classList.add("selected");

    analyticsBtnIcon.classList.remove("selected");
    analyticsBtnLink.classList.remove("selected");

    createContent.style.display = "block";
    analyticsContent.style.display = "none";
  }
});

analyticsBtnSideBar.addEventListener("click", () => {
  if (
    analyticsBtnIcon.classList.contains("selected") === false &&
    analyticsBtnLink.classList.contains("selected") === false
  ) {
    analyticsBtnIcon.classList.add("selected");
    analyticsBtnLink.classList.add("selected");

    createBtnIcon.classList.remove("selected");
    createBtnLink.classList.remove("selected");

    createContent.style.display = "none";
    analyticsContent.style.display = "block";
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const mainContent = document.querySelector(".main-content");

  mainContent.addEventListener("change", function (event) {
    if (event.target && event.target.type === "file") {
      console.log(event);
      handleFileSelect(event);
    }
  });
});

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.classList.add("uploaded-image");
      const container = event.target.closest(".main-border");

      // Remove existing image if any

      const existingImg = container.querySelector("img");
      if (existingImg) {
        existingImg.remove();
      }

      container.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
}

// *****************************************************************************************************************************************

//Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
//////////////////////////////
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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
    userNameElement.textContent = name || "Teacher";
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

// -------------------------------------------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------------------------------------------

// Storing of the data in the firebase
const storage = getStorage(app);
async function saveExamToFirebase() {
  const courseCode = document.querySelector("#courseCode").value;
  const examName = document.querySelector("#examName").value;
  const totalMarks = parseFloat(
    document.querySelector("span.total-marks").textContent
  );

  const questions = [];
  const questionContainers = document.querySelectorAll(".main-border");

  for (let i = 0; i < questionContainers.length; i++) {
    const container = questionContainers[i];
    const questionText = container.querySelector(".question-text").value;
    const marks = parseFloat(container.querySelector(".marks").value) || 0;
    const imageInput = container.querySelector('input[type="file"]');

    let imageUrl = "";
    if (imageInput.files.length > 0) {
      const file = imageInput.files[0];
      const storageRef = ref(
        storage,
        `examImages/${courseCode}_${examName}_Q${i + 1}`
      );
      await uploadBytes(storageRef, file);
      imageUrl = await getDownloadURL(storageRef);
    }

    questions.push({
      questionNumber: i + 1,
      questionText: questionText,
      marks: marks,
      imageUrl: imageUrl,
    });
  }

  try {
    const docRef = await addDoc(collection(db, "exams"), {
      courseCode: courseCode,
      examName: examName,
      totalMarks: totalMarks,
      questions: questions,
      createdBy: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
    successPopUp.style.display = "flex";
    console.log("Exam saved with ID: ", docRef.id);
    // You can add user feedback here (e.g., show a success message)
  } catch (error) {
    console.error("Error saving exam: ", error);
    // You can add user feedback here (e.g., show an error message)
  }
}

// Add this event listener to your submit button
document
  .querySelector(".submit-btn")
  .addEventListener("click", saveExamToFirebase);
