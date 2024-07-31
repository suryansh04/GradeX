var seeIcon = document.querySelector(".see-icon");
var unSeeIcon = document.querySelector(".unsee-icon");
var passwordInput = document.querySelector(".passwordInputType");

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
