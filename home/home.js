import { DEMO_STEPS } from "./demo-steps.js";
import { initDemoTour } from "./demo-tour.js";

initDemoTour(document.querySelector("[data-tour]"), DEMO_STEPS);

document.getElementById("year").textContent = String(new Date().getFullYear());
