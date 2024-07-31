import { passwordStrength } from "../node_modules/check-password-strength/dist/index.mjs";

var seeIcon = document.querySelector(".see-icon");
var unSeeIcon = document.querySelector(".unsee-icon");
var passwordInput = document.querySelector(".passwordInputType");

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

//-----------------------------------------------------------------------------
