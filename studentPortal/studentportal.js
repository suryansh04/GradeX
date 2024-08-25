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

/** Text area text */
