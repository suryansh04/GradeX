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
var loader = document.querySelector(".loader");
var overlay = document.querySelector(".overlay");

const answerSheetContainer = document.querySelector(".answer-sheet-container");

var questionNumber = 1;

// Function to update the total marks
/** Spinner Function */
function showSpinner() {
  loader.style.display = "block";
  overlay.style.display = "block";
}

function hideSpinner() {
  loader.style.display = "none";
  overlay.style.display = "none";
}
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

// GradeX API

import { apiRequest, requireSession } from "../lib/api.js";

requireSession();

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

// ------------------------------------------------------------------------------------------------------------------------------------

// Storing of the data through the API

/** Uploads a question image and returns the URL it is served from. */
async function uploadQuestionImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { url } = await apiRequest("/uploads/images", {
    method: "POST",
    formData,
  });
  return url;
}

// Function to read PDF and extract answers
function readPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const typedarray = new Uint8Array(event.target.result);

      pdfjsLib
        .getDocument(typedarray)
        .promise.then((pdf) => {
          let answers = [];
          const numPages = pdf.numPages;
          const pagePromises = [];

          for (let i = 1; i <= numPages; i++) {
            pagePromises.push(
              pdf.getPage(i).then((page) => {
                return page.getTextContent().then((textContent) => {
                  const pageText = textContent.items
                    .map((item) => item.str)
                    .join(" ");
                  const answerMatches = pageText.match(
                    /A(\d+)\s*\)([\s\S]*?)(?=A\d+\s*\)|$)/g
                  );
                  if (answerMatches) {
                    answerMatches.forEach((match) => {
                      const [, questionNumber, answerText] =
                        match.match(/A(\d+)\s*\)([\s\S]*)/);
                      const index = parseInt(questionNumber) - 1;
                      answers[index] = answerText.trim();
                    });
                  }
                });
              })
            );
          }

          Promise.all(pagePromises).then(() => {
            // Remove any undefined elements from the answers array
            answers = answers.filter((answer) => answer !== undefined);
            resolve(answers);
          });
        })
        .catch((error) => {
          reject(error);
        });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
async function saveExam() {
  const courseCode = document.querySelector("#courseCode").value;
  const examName = document.querySelector("#examName").value;

  const questions = [];
  const questionContainers = document.querySelectorAll(".main-border");

  for (let i = 0; i < questionContainers.length; i++) {
    const container = questionContainers[i];
    const questionText = container.querySelector(".question-text").value;
    const marks = parseFloat(container.querySelector(".marks").value) || 0;
    const imageInput = container.querySelector('input[type="file"]');

    let imageUrl = null;
    if (imageInput.files.length > 0) {
      imageUrl = await uploadQuestionImage(imageInput.files[0]);
    }

    questions.push({
      question_number: i + 1,
      question_text: questionText,
      marks: marks,
      image_url: imageUrl,
    });
  }

  // Get the answers from the PDF
  const answerSheetFile = document.getElementById("pdfUpload1").files[0];
  let answers = [];
  if (answerSheetFile) {
    answers = await readPDF(answerSheetFile);
  }

  const exam = await apiRequest("/exams", {
    method: "POST",
    json: {
      course_code: courseCode,
      exam_name: examName,
      questions: questions,
      answers: answers,
    },
  });
  console.log("Exam saved with ID: ", exam.id);
}

// Answer sheet dialog. Listeners are registered once, not on every submit click,
// so a second attempt does not save the exam twice.
const fileInput = document.getElementById("pdfUpload1");
const AnswerSheetsubmitBtn = document.getElementById("AnswerSheetsubmitBtn");
const closeBtn = document.getElementById("closeBtn");
const uploadLabel = document.getElementById("uploadLabel");
const uploadText = document.getElementById("uploadText");

document.querySelector(".submit-btn").addEventListener("click", () => {
  answerSheetContainer.style.display = "flex";
});

fileInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    const fileName = file.name;
    const maxLength = 30;
    const displayName =
      fileName.length > maxLength
        ? fileName.substring(0, maxLength - 3) + "..."
        : fileName;
    uploadText.textContent = displayName;
  } else {
    uploadText.textContent = "Upload Answer Sheet";
  }
});

AnswerSheetsubmitBtn.addEventListener("click", async function () {
  const file = fileInput.files[0];
  if (!file) {
    alert("Please select a file first.");
    return;
  }

  console.log("Uploading file:", file.name);
  showSpinner();
  AnswerSheetsubmitBtn.disabled = true;
  try {
    // Wait for the save before resetting the form: it reads the answer sheet.
    await saveExam();
    successPopUp.style.display = "flex";
    answerSheetContainer.style.display = "none";

    // Reset the form
    fileInput.value = "";
    uploadText.textContent = "Upload Answer Sheet";
    uploadLabel.style.border = "2px dashed #4876ff";
  } catch (error) {
    console.error("Error saving exam: ", error);
    alert(`The exam could not be saved. ${error.message}`);
  } finally {
    AnswerSheetsubmitBtn.disabled = false;
    hideSpinner();
  }
});

closeBtn.addEventListener("click", function () {
  answerSheetContainer.style.display = "none";
});
