import { apiRequest } from "../lib/api.js";
import { $, html, setHtml } from "../lib/dom.js";
import { examMeta } from "../lib/exam-meta.js";
import { runTask } from "../lib/feedback.js";
import { formatDateTime, formatDuration, formatMarks } from "../lib/format.js";
import { initPortal } from "../lib/shell.js";

const examList = $("#exam-list");
const resultsList = $("#results");
const resultsPanel = $('[data-panel="results"]');
const startDialog = $("#start-dialog");

const examUrl = (examId) => `../examPortal/examportal.html?examId=${encodeURIComponent(examId)}`;

// --- Exams ---------------------------------------------------------------------

function examAction(exam) {
  const status = exam.attempt?.status;
  if (status === "submitted") {
    return html`
      <span class="badge badge-green"><i class="fa-solid fa-check"></i>Submitted</span>
      <button class="btn btn-outline btn-pill" type="button" data-view-result="${exam.attempt.submission_id}">
        View result
      </button>`;
  }
  if (status === "in_progress") {
    return html`
      <span class="badge badge-amber">In progress</span>
      <a class="btn btn-primary btn-pill" href="${examUrl(exam.id)}">Resume</a>`;
  }
  return html`<button class="btn btn-primary btn-pill" type="button" data-start="${exam.id}">Start</button>`;
}

function examRow(exam) {
  return html`
    <article class="exam-row">
      <span class="pill pill-code">${exam.course_code}</span>
      <div>
        <h3 class="exam-row-title">${exam.exam_name}</h3>
        ${examMeta(exam)}
      </div>
      <div class="exam-row-action">${examAction(exam)}</div>
    </article>`;
}

let exams = [];

async function loadExams() {
  await runTask(async () => {
    exams = await apiRequest("/exams");
    setHtml(
      examList,
      exams.length
        ? exams.map(examRow)
        : html`<div class="empty-state"><i class="fa-regular fa-calendar"></i>No exams yet. Check back once your teacher publishes one.</div>`
    );
  });
}

function confirmStart(exam) {
  $("#start-dialog-text").textContent = exam.duration_minutes
    ? `${exam.exam_name} has a time limit of ${formatDuration(exam.duration_minutes)}. The timer starts now and keeps running even if you close the page. You can submit only once.`
    : `${exam.exam_name} has no time limit. Your answers save as you type, and you can submit only once.`;
  startDialog.returnValue = "";
  startDialog.showModal();
  startDialog.addEventListener(
    "close",
    () => startDialog.returnValue === "start" && (window.location.href = examUrl(exam.id)),
    { once: true }
  );
}

examList.addEventListener("click", (event) => {
  const start = event.target.closest("[data-start]");
  if (start) confirmStart(exams.find((exam) => exam.id === start.dataset.start));

  const view = event.target.closest("[data-view-result]");
  if (view) portal.showTab("results", view.dataset.viewResult);
});

// --- Results -------------------------------------------------------------------

const STATUS_BADGES = {
  correct: "badge-green",
  "partially correct": "badge-amber",
  "partially incorrect": "badge-amber",
  incorrect: "badge-rose",
  plagiarized: "badge-rose",
};

const statusBadge = (status) => STATUS_BADGES[status.toLowerCase()] ?? "badge-gray";

function resultCard(question, response, index) {
  return html`
    <div class="splide result-card" aria-label="Result for question ${index + 1}">
      <div class="splide__track">
        <ul class="splide__list">
          <li class="splide__slide">
            <span class="badge">${response.plagiarism_status}</span>
            <div class="result-marks">
              <span class="result-qno">Q${index + 1}</span>
              <div>
                <p class="result-status">${response.answer_status}</p>
                <p>${formatMarks(response.grade)}/${formatMarks(question.marks)}</p>
              </div>
            </div>
            <div><h4>Feedback</h4><p>${response.feedback}</p></div>
          </li>
          <li class="splide__slide"><h4>Correct Answer</h4><p>${response.sample_answer}</p></li>
          <li class="splide__slide"><h4>Common Mistake</h4><p>${response.common_mistake || "None noted."}</p></li>
          <li class="splide__slide">
            <div class="learning-tip">
              <h4><i class="fa-solid fa-lightbulb"></i>Learning Tip</h4>
              <p>${response.learning_tip || "Keep practising!"}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>`;
}

const pendingCard = html`
  <div class="result-pending">
    <i class="fa-solid fa-hourglass-half"></i>
    <p>Being graded. This page updates on its own.</p>
  </div>`;

function resultBlock(submission) {
  const graded = submission.graded_responses;
  const score =
    submission.score === null
      ? html`<span class="badge badge-blue">Grading in progress</span>`
      : html`<p class="score">${formatMarks(submission.score)} <small>/ ${formatMarks(submission.total_marks)}</small></p>`;

  return html`
    <section class="result-block" id="result-${submission.id}">
      <header class="result-header">
        <div class="result-exam">
          <span class="pill pill-code">${submission.course_code}</span>
          <h3>${submission.exam_name}</h3>
          <p class="result-date">Submitted ${formatDateTime(submission.submitted_at)}</p>
        </div>
        ${score}
      </header>
      ${submission.questions.map(
        (question, index) => html`
          <div class="result-row">
            <div>
              <p class="result-question"><strong>Q${index + 1}</strong> ${question.question_text}</p>
              <div class="answer-box">${submission.answers[index]}</div>
            </div>
            ${graded ? resultCard(question, graded[index], index) : pendingCard}
          </div>`
      )}
    </section>`;
}

let carousels = [];

function mountCarousels() {
  carousels.forEach((carousel) => carousel.destroy());
  carousels = [...resultsList.querySelectorAll(".splide")].map((element) =>
    new window.Splide(element, { arrows: false, autoHeight: true }).mount()
  );
}

function renderResults(submissions) {
  setHtml(
    resultsList,
    submissions.length
      ? submissions.map(resultBlock)
      : html`<div class="empty-state"><i class="fa-solid fa-chart-simple"></i>Your results will appear here after you submit an exam.</div>`
  );
  mountCarousels();
}

// While any result is still being graded, check again quietly (no loader) every so often.
const POLL_MS = 15_000;
let pollTimer;
const gradedCount = (submissions) => submissions.filter((s) => s.score !== null).length;

function pollWhileGrading(submissions) {
  clearTimeout(pollTimer);
  if (gradedCount(submissions) === submissions.length) return;
  pollTimer = setTimeout(async () => {
    if (resultsPanel.hidden) return; // Showing the tab again reloads and restarts polling.
    let latest = submissions;
    try {
      latest = await apiRequest("/submissions/me");
      // Re-render only when something changed, so an open carousel isn't reset.
      if (latest.length !== submissions.length || gradedCount(latest) !== gradedCount(submissions)) {
        renderResults(latest);
      }
    } catch {
      // Offline for a moment: keep what is on screen and try again next time.
    }
    pollWhileGrading(latest);
  }, POLL_MS);
}

async function loadResults(focusSubmissionId) {
  clearTimeout(pollTimer);
  const submissions = await runTask(() => apiRequest("/submissions/me"));
  if (!submissions) return;
  renderResults(submissions);
  if (focusSubmissionId) document.getElementById(`result-${focusSubmissionId}`)?.scrollIntoView();
  pollWhileGrading(submissions);
}

$("#refresh-results").addEventListener("click", () => loadResults());

// --- Start ---------------------------------------------------------------------

const portal = await initPortal({
  role: "student",
  onShow: { exams: loadExams, results: loadResults },
});
portal?.showTab(new URLSearchParams(location.search).get("tab") === "results" ? "results" : "exams");
