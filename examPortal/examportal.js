var loader = document.querySelector(".loader");
var overlay = document.querySelector(".overlay");

import { apiRequest, requireSession } from "../lib/api.js";

requireSession();

let currentExam;
let currentQuestionIndex = 0;
let studentAnswers = []; // Array to store student answers
// Function to get URL parameters
function getUrlParameter(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

// Updated function to fetch exam data
async function fetchExamData(examId) {
  showSpinner();
  hideQuestionContent();
  try {
    currentExam = await apiRequest(`/exams/${encodeURIComponent(examId)}`);
    displayQuestion(currentQuestionIndex);
    showQuestionContent();
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
  document.querySelector(".question").textContent = question.question_text;
  document.querySelector("textarea").value = studentAnswers[index] || "";

  // Handle image display
  const imageContainer = document.getElementById("questionImage");
  if (question.image_url) {
    imageContainer.querySelector("img").src = question.image_url;
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
  // Save the current answer
  const currentAnswer = document.querySelector("textarea").value;
  studentAnswers[currentQuestionIndex] = currentAnswer;

  currentQuestionIndex++;
  if (currentQuestionIndex < currentExam.questions.length) {
    displayQuestion(currentQuestionIndex);
  } else {
    // Exam finished, submit answers (the server grades them in the background)
    saveStudentAnswers();

    // startExam(examId);
  }
});

// Updated function to save student answers
async function saveStudentAnswers() {
  showSpinner();
  try {
    const examId = getUrlParameter("examId");

    const submission = await apiRequest("/submissions", {
      method: "POST",
      json: { exam_id: examId, answers: studentAnswers },
    });

    console.log("Student answers saved with ID: ", submission.id);
    alert("Exam completed and answers submitted successfully!");
    // Redirect to a thank you page or back to the main menu
    // window.location.href = "thank-you.html";
  } catch (error) {
    console.error("Error saving student answers:", error);
    alert(`There was an error submitting your answers. ${error.message}`);
  } finally {
    hideSpinner();
  }
}

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

// Spinner functions
function showSpinner() {
  loader.style.display = "block";
  overlay.style.display = "block";
}

function hideSpinner() {
  loader.style.display = "none";
  overlay.style.display = "none";
}

function showQuestionContent() {
  document.getElementById("questionContent").classList.remove("hidden");
}

function hideQuestionContent() {
  document.getElementById("questionContent").classList.add("hidden");
}
