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
var loader = document.querySelector(".loader");

// Hamburger Menu
let splideInstances = [];
hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("active");
});

/** Spinner Function */
function showSpinner() {
  loader.style.display = "block";
}

function hideSpinner() {
  loader.style.display = "none";
}

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

    clearSplideElements();
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
    FetchQuestionAnswer();
    FetchResultData();
  }
});

function clearSplideElements() {
  console.log("Clearing Splide elements");
  // Destroy all Splide instances
  splideInstances.forEach((instance) => instance.destroy());
  splideInstances = [];

  // Clear the result container
  const resultContainer = document.querySelector(".result-container");
  if (resultContainer) {
    resultContainer.innerHTML = "";
  }

  // Clear the question-answer container
  const questionAnswerContainer = document.querySelector(
    ".question-answer-container"
  );
  if (questionAnswerContainer) {
    questionAnswerContainer.innerHTML = "";
  }
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------

// GradeX API

import { apiRequest, requireSession } from "../lib/api.js";

requireSession();

/** The student's submissions that have been graded; results show only these. */
async function fetchGradedSubmissions() {
  const submissions = await apiRequest("/submissions/me");
  return submissions.filter((submission) => submission.graded_responses);
}

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

// ----------------------------------------------------------------------------------------------------------------------------------------
/// Fetching exams from the API

// Function to fetch and display exams

async function fetchAndDisplayExams() {
  showSpinner();
  try {
    const exams = await apiRequest("/exams");
    const examList = document.querySelector(".exam-list");

    exams.forEach((exam) => {
      examList.appendChild(createExamElement(exam, exam.id));
    });
  } catch (error) {
    console.error("Error fetching exams: ", error);
  } finally {
    hideSpinner();
  }
}

// Function to create exam element

function createExamElement(examData, examId) {
  const examInfoContainer = document.createElement("div");
  examInfoContainer.className = "exam-info-container";
  examInfoContainer.innerHTML = `
    <div class="exam-main-info-container">
      <div class="course-code-container">
        <p class="course-code">${examData.course_code}</p>
      </div>
      <div class="exam-name-container">
        <p>${examData.exam_name}</p>
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

document.addEventListener("DOMContentLoaded", async () => {
  const name = getUrlParameter("name");
  updateUserName(name);
  await fetchAndDisplayExams();
});

///-----------------------------------------------------------------------------------------------------------------------------------------
///----------------------------------------------------------------------------------------------------------------------------------------------
// Result Container Handling and Fetching Data

//Fetching Question And Student Response
let containerHeightArray = [];
async function FetchQuestionAnswer() {
  showSpinner();

  try {
    const submissions = await fetchGradedSubmissions();
    const QuestionAnswerList = document.querySelector(
      ".question-answer-container"
    );

    submissions.forEach((answerData) => {
      answerData.questions.forEach((_, index) => {
        const QuestionAnswerElement = createQuestionAnswerElement(
          answerData,
          index
        );
        QuestionAnswerList.appendChild(QuestionAnswerElement);
      });
    });

    // Setting Height

    var questionInfoContainer = document.querySelectorAll(
      ".question-answer-info-container"
    );

    for (let i = 0; i < questionInfoContainer.length; i++) {
      let height = questionInfoContainer[i].clientHeight;
      console.log(`The height is ${height}`);
      containerHeightArray.push(height);
    }
  } catch (error) {
    console.error("Error fetching exams: ", error);
  } finally {
    hideSpinner();
  }
}

function createQuestionAnswerElement(answerData, index) {
  const QuestionAnswerInfoContainer = document.createElement("div");
  QuestionAnswerInfoContainer.className = "question-answer-info-container";
  QuestionAnswerInfoContainer.innerHTML = `
      <div class="question-container">
                  <div class="question-number">Q<span class = question-index>${
                    index + 1
                  }</span></div>
                  <div class="question">
                    <p>
                      ${answerData.questions[index].question_text}
                    </p>
                  </div>
                </div>
                <div class="answer-container">
                  <div class="answer">
                    <textarea readonly>
                    ${answerData.answers[index]}
                    </textarea>
                  </div>
                </div>
        `;

  return QuestionAnswerInfoContainer;
}
//---------------------------------------------------------------------------------------------------------------------------------------
//Fetching Claude's Response

async function FetchResultData() {
  clearSplideElements(); // Clear existing elements before fetching new data
  showSpinner();
  try {
    const submissions = await fetchGradedSubmissions();
    const resultList = document.querySelector(".result-container");

    submissions.forEach((resultData) => {
      resultData.graded_responses.forEach((_, index) => {
        const resultElement = createResultElement(resultData, index);
        resultList.appendChild(resultElement);
      });
    });

    // Initialize all Splide instances after creating all elements
    document.querySelectorAll(".splide").forEach((elem, index) => {
      new Splide(elem, {
        type: "slide",
        perPage: 1,
        perMove: 1,
        arrows: false,
      }).mount();
    });

    var splideContainers = document.querySelectorAll(".splide");

    for (let i = 0; i < splideContainers.length; i++) {
      console.log(splideContainers[i].style.height);
      splideContainers[i].style.height = `${containerHeightArray[i] + 40}px`;
      console.log(`${containerHeightArray[i] + 40}px`);
    }
  } catch (error) {
    console.error("Error fetching results:", error);
  } finally {
    hideSpinner();
  }
}

function createResultElement(resultData, index) {
  const resultAnswerInfoContainer = document.createElement("div");
  resultAnswerInfoContainer.className = "splide";
  resultAnswerInfoContainer.id = `splide-${index}`;
  const response = resultData.graded_responses[index];
  resultAnswerInfoContainer.innerHTML = `
    <div class="splide__track">
      <ul class="splide__list">
        <li class="splide__slide">
          <div class="result-container-course-code">
            <p>${resultData.course_code} ${resultData.exam_name}</p>
        
          </div>
              <p class = "p-status">${
                response.plagiarism_status
              }</p>
          <div class="marks">
            <div class="result-container-question-number">
              <p>Q<span class="index">${index + 1}</span></p>
            </div>
            <div class="question-status-marks">
              <p>${response.answer_status}</p>
              <p>${response.grade}/${
    resultData.questions[index].marks
  }</p>
            </div>
          </div>

           <div class="feedback-container">
            <p>Feedback</p>
            <p class="feedback-text">${
              response.feedback
            }</p>
          </div>  
        </li>
        <li class="splide__slide">
         <div class="correct-answer-container">
<p>Correct Answer</p>
<p class="correct-answer-text">
${response.sample_answer}
</p>
</div>
        </li>
      

   <li class="splide__slide">
<div class="common-mistake-container">
<p>Common Mistake</p>
<p class="common-mistake-text">
${response.common_mistake}
</p>
</div>

        </li>
  <li class="splide__slide">
<div class="learning-tip-container">
<p><i class="fa-solid fa-lightbulb"></i>Learning Tip</p>
<p class="learning-tip-text">
${response.learning_tip}
</p>
</div>

        </li>
      </ul>
    </div>
  `;

  console.log(
    `Created Splide element with id: ${resultAnswerInfoContainer.id}`
  );
  return resultAnswerInfoContainer;
}
