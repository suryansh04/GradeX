import { ApiError, requireRole } from "../lib/api.js";
import { startCountdown } from "../lib/countdown.js";
import { $, html, setHtml } from "../lib/dom.js";
import { showToast, withLoader } from "../lib/feedback.js";
import { formatCountdown, formatMarks, pluralize } from "../lib/format.js";
import { ExamSession, SaveStatus } from "./exam-session.js";

const PORTAL = "../studentPortal/studentportal.html";
const WARNING_MS = 5 * 60 * 1000;
const CRITICAL_MS = 60 * 1000;

const answerInput = $("#answer");
const reviewDialog = $("#review-dialog");
let session;
let current = 0;
let stopCountdown = () => {};

// --- Full-page messages ------------------------------------------------------------

const ICONS = { success: "fa-circle-check", error: "fa-circle-exclamation", info: "fa-circle-info" };

function showMessage({ tone = "info", title, text, actions }) {
  $("#exam").hidden = true;
  const icon = $("#message-icon");
  icon.dataset.tone = tone;
  setHtml(icon, html`<i class="fa-solid ${ICONS[tone]}"></i>`);
  $("#message-title").textContent = title;
  $("#message-text").textContent = text;
  setHtml(
    $("#message-actions"),
    actions.map(
      ({ label, href, primary }) =>
        html`<a class="btn btn-pill ${primary ? "btn-primary" : "btn-outline"}" href="${href}">${label}</a>`
    )
  );
  $("#exam-message").hidden = false;
}

const toResults = { label: "View results", href: `${PORTAL}?tab=results`, primary: true };
const toExams = { label: "Back to exams", href: PORTAL };

// --- Questions -----------------------------------------------------------------------

function renderNav() {
  setHtml(
    $("#question-nav"),
    session.exam.questions.map(
      (_, index) => html`
        <li>
          <button type="button" data-question="${index}" data-answered="${session.isAnswered(index)}"
            ${index === current ? html`aria-current="step"` : ""} aria-label="Question ${index + 1}">
            ${index + 1}
          </button>
        </li>`
    )
  );
}

function showQuestion(index) {
  current = index;
  const question = session.exam.questions[index];
  const isLast = index === session.exam.questions.length - 1;

  $("#question-number").textContent = `Q${index + 1} of ${session.exam.questions.length}`;
  $("#question-marks").textContent = pluralize(Number(formatMarks(question.marks)), "mark");
  $("#question-text").textContent = question.question_text;

  const figure = $("#question-image");
  figure.hidden = !question.image_url;
  if (question.image_url) figure.querySelector("img").src = question.image_url;

  answerInput.value = session.answers[index];
  $("#prev-btn").disabled = index === 0;
  $("#next-btn").hidden = isLast;
  // On the last question, submitting is the main action.
  $("#review-btn").classList.toggle("btn-primary", isLast);
  $("#review-btn").classList.toggle("btn-outline", !isLast);
  renderNav();
}

$("#question-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-question]");
  if (button) showQuestion(Number(button.dataset.question));
});
$("#prev-btn").addEventListener("click", () => showQuestion(current - 1));
$("#next-btn").addEventListener("click", () => showQuestion(current + 1));

answerInput.addEventListener("input", () => {
  const wasAnswered = session.isAnswered(current);
  session.setAnswer(current, answerInput.value);
  if (wasAnswered !== session.isAnswered(current)) renderNav();
});

// --- Save status and timer -----------------------------------------------------------

const SAVE_LABELS = {
  [SaveStatus.SAVED]: "All answers saved",
  [SaveStatus.UNSAVED]: "Unsaved changes",
  [SaveStatus.SAVING]: "Saving…",
  [SaveStatus.FAILED]: "Couldn't save. Retrying…",
};

function showSaveStatus(status) {
  const label = $("#save-status");
  label.dataset.status = status;
  label.textContent = SAVE_LABELS[status];
}

function startTimer() {
  const timer = $("#timer");
  timer.hidden = false;
  stopCountdown = startCountdown({
    endsAt: session.endsAt,
    onTick(msLeft) {
      $("#timer-value").textContent = formatCountdown(msLeft);
      timer.dataset.level = msLeft <= CRITICAL_MS ? "critical" : msLeft <= WARNING_MS ? "warning" : "ok";
    },
    onEnd() {
      showToast("Time's up! Submitting your answers…", "error");
      submit();
    },
  });
}

// --- Review and submit ---------------------------------------------------------------

function openReview() {
  const unanswered = session.unansweredCount;
  $("#review-summary").textContent = unanswered
    ? `${pluralize(unanswered, "question")} still unanswered. You can submit only once.`
    : "Every question has an answer. You can submit only once.";

  setHtml(
    $("#review-list"),
    session.exam.questions.map(
      (question, index) => html`
        <li>
          <button type="button" data-question="${index}">
            <span class="review-q">Q${index + 1}</span>
            <span class="review-text">${question.question_text}</span>
            ${session.isAnswered(index)
              ? html`<span class="badge badge-green">Answered</span>`
              : html`<span class="badge badge-amber">Not answered</span>`}
          </button>
        </li>`
    )
  );
  reviewDialog.showModal();
}

$("#review-btn").addEventListener("click", openReview);
$("#review-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-question]");
  if (!button) return;
  reviewDialog.close();
  showQuestion(Number(button.dataset.question));
  answerInput.focus();
});
reviewDialog.addEventListener("click", (event) => event.target.closest("[data-close]") && reviewDialog.close());

let submitting = false;

async function submit() {
  if (submitting) return;
  submitting = true;
  stopCountdown();
  if (reviewDialog.open) reviewDialog.close();

  try {
    const result = await withLoader(() => session.submit());
    showMessage({
      tone: "success",
      title: "Answers submitted",
      text: result.answers_accepted
        ? "Your answers are being graded. Results usually appear within a few minutes."
        : "Time had run out, so your last saved answers were submitted. They are being graded now.",
      actions: [toResults, toExams],
    });
  } catch (error) {
    submitting = false;
    if (error instanceof ApiError && error.status === 409) {
      showMessage({ title: "This exam is closed", text: error.message, actions: [toResults, toExams] });
    } else {
      showToast(`${error.message} Your answers are still here, so try submitting again.`, "error");
    }
  }
}

$("#submit-btn").addEventListener("click", submit);

// Save before the page goes away, and warn if that might not finish.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && session?.hasUnsavedChanges && !submitting) {
    session.save({ keepalive: true });
  }
});
window.addEventListener("beforeunload", (event) => {
  if (session?.hasUnsavedChanges && !submitting) event.preventDefault();
});

// --- Start ---------------------------------------------------------------------------

async function init() {
  const examId = new URLSearchParams(location.search).get("examId");
  if (!examId) {
    showMessage({ tone: "error", title: "No exam selected", text: "Choose an exam from your list.", actions: [toExams] });
    return;
  }
  if (!(await requireRole("student"))) return;

  try {
    session = await withLoader(() => ExamSession.start(examId));
  } catch (error) {
    const closed = error instanceof ApiError && error.status === 409;
    showMessage({
      tone: closed ? "info" : "error",
      title: closed ? "This exam is closed" : "Couldn't open this exam",
      text: error.message,
      actions: closed ? [toResults, toExams] : [toExams],
    });
    return;
  }

  session.onStatusChange = showSaveStatus;
  session.onAttemptClosed = () => submit();
  document.title = `${session.exam.exam_name} · GradeX`;
  $("#course-code").textContent = session.exam.course_code;
  $("#exam-name").textContent = session.exam.exam_name;
  $("#exam-title").hidden = false;
  showSaveStatus(SaveStatus.SAVED);
  $("#exam").hidden = false;

  // Resume at the first unanswered question.
  const firstUnanswered = session.answers.findIndex((_, index) => !session.isAnswered(index));
  showQuestion(Math.max(firstUnanswered, 0));
  if (session.isTimed) startTimer();
}

init();
