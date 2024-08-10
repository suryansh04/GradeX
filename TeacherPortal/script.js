var hamburger = document.querySelector(".hamburger");
var sidebar = document.querySelector(".sidebar");
var popup = document.querySelector("#popup");
var cancelBtn = document.querySelector("#cancelBtn");
var okBtn = document.querySelector("#okBtn");
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

okBtn.addEventListener("click", () => {
  var courseCode = document.querySelector("#courseCode").value;
  var examName = document.querySelector("#examName").value;
  console.log(courseCode);
  console.log(examName);
  popup.style.display = "none";
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
