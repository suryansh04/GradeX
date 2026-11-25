import { apiRequest } from "../lib/api.js";
import { $ } from "../lib/dom.js";
import { runTask as run, showToast } from "../lib/feedback.js";
import { pluralize } from "../lib/format.js";
import { initPortal } from "../lib/shell.js";
import { initAnalytics, loadOverview } from "./analytics.js";
import { readAnswerSheet } from "./answer-sheet.js";
import { ExamBuilder } from "./exam-builder.js";

const builder = new ExamBuilder($("#exam-form"), { onError: (message) => showToast(message, "error") });
const sheetDialog = $("#sheet-dialog");
const successDialog = $("#success-dialog");
const sheetInput = $("#sheet-input");
const publishButton = $("#publish-btn");
let sheetAnswers = null;

for (const dialog of [sheetDialog, successDialog]) {
  dialog.addEventListener("click", (event) => event.target.closest("[data-close]") && dialog.close());
}

// --- Step 1: check the form, then ask for the answer sheet ---------------------------

$("#exam-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const problem = builder.validate();
  if (problem) {
    showToast(problem, "error");
    return;
  }
  sheetInput.value = "";
  sheetAnswers = null;
  showSheetStatus();
  sheetDialog.showModal();
});

// --- Step 2: read the answer sheet ----------------------------------------------------

function showSheetStatus(fileName, tone, message) {
  $("#sheet-name").textContent = fileName ?? "Choose or drop the answer sheet (PDF)";
  const check = $("#sheet-check");
  check.hidden = !message;
  check.dataset.tone = tone ?? "";
  check.textContent = message ?? "";
  publishButton.disabled = tone !== "ok";
}

async function useSheet(file) {
  if (!file) return;
  if (file.type !== "application/pdf") {
    showSheetStatus(file.name, "error", "Choose a PDF file.");
    return;
  }
  const answers = await run(() => readAnswerSheet(file));
  if (!answers) {
    showSheetStatus(file.name, "error", "That PDF couldn't be read.");
    return;
  }

  const expected = builder.cards.length;
  sheetAnswers = answers;
  if (answers.length === expected) {
    showSheetStatus(file.name, "ok", `Found ${pluralize(answers.length, "answer")}, one for each question.`);
  } else {
    showSheetStatus(
      file.name,
      "error",
      `Found ${pluralize(answers.length, "answer")} but the exam has ${pluralize(expected, "question")}. ` +
        "Check that every answer starts with A1), A2) and so on."
    );
  }
}

sheetInput.addEventListener("change", () => useSheet(sheetInput.files[0]));

const dropzone = $("#dropzone");
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragging");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-dragging");
  useSheet(event.dataTransfer.files[0]);
});

// --- Step 3: upload images and publish ------------------------------------------------

async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { url } = await apiRequest("/uploads/images", { method: "POST", formData });
  return url;
}

async function publish() {
  const { questions, ...details } = builder.values();
  const withImages = [];
  for (const { imageFile, ...question } of questions) {
    withImages.push({ ...question, image_url: imageFile ? await uploadImage(imageFile) : null });
  }
  return apiRequest("/exams", {
    method: "POST",
    json: { ...details, questions: withImages, answers: sheetAnswers },
  });
}

publishButton.addEventListener("click", async () => {
  publishButton.disabled = true;
  const exam = await run(publish);
  if (!exam) {
    publishButton.disabled = false;
    return;
  }
  sheetDialog.close();
  builder.reset();
  $("#success-text").textContent = `Students can now take ${exam.exam_name}.`;
  successDialog.showModal();
});

// --- Portal -----------------------------------------------------------------------------

initAnalytics();
const portal = await initPortal({
  role: "teacher",
  onShow: { analytics: () => run(loadOverview) },
});

$("#success-analytics").addEventListener("click", () => {
  successDialog.close();
  portal?.showTab("analytics");
});
