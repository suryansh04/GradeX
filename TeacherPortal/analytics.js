/** The Analytics tab: an overview of the teacher's exams and a per-exam report. */
import { apiRequest } from "../lib/api.js";
import { $, html, setHtml } from "../lib/dom.js";
import { runTask } from "../lib/feedback.js";
import { examMeta } from "../lib/exam-meta.js";
import { formatDateTime, formatMarks } from "../lib/format.js";

const overview = $("#analytics-overview");
const detail = $("#analytics-detail");

function averageTile(exam) {
  if (exam.average_score === null) return html`<dd>–</dd>`;
  const percent = Math.round((exam.average_score / exam.total_marks) * 100);
  const marks = `${formatMarks(exam.average_score)} of ${formatMarks(exam.total_marks)} marks`;
  return html`<dd title="${marks}">${percent}%<span class="visually-hidden"> (${marks})</span></dd>`;
}

function statTiles(exam) {
  return html`
    <dl class="stat-tiles">
      <div class="stat-tile"><dt>Submitted</dt><dd>${exam.submission_count}</dd></div>
      <div class="stat-tile"><dt>Graded</dt><dd>${exam.graded_count}</dd></div>
      <div class="stat-tile"><dt>Average</dt>${averageTile(exam)}</div>
    </dl>`;
}

function examCard(exam) {
  return html`
    <article class="card exam-stat-card">
      <span class="pill pill-code">${exam.course_code}</span>
      <div>
        <h3>${exam.exam_name}</h3>
        ${examMeta(exam)}
      </div>
      ${statTiles(exam)}
      <button class="btn btn-outline btn-pill" type="button" data-report="${exam.id}">View results</button>
    </article>`;
}

function scoreCell(row, totalMarks) {
  return row.score === null
    ? html`<span class="badge badge-blue">Grading</span>`
    : html`<span><strong>${formatMarks(row.score)}</strong> / ${formatMarks(totalMarks)}</span>`;
}

function reportView(report) {
  const rows = report.submissions.map(
    (row) => html`
      <tr>
        <td data-label="Student">
          <div><div>${row.student_name}</div><div class="student-email">${row.student_email}</div></div>
        </td>
        <td data-label="Submitted">${formatDateTime(row.submitted_at)}</td>
        <td data-label="Score">${scoreCell(row, report.total_marks)}</td>
      </tr>`
  );

  return html`
    <div class="report-header">
      <div class="report-title">
        <span class="pill pill-code">${report.course_code}</span>
        <h2>${report.exam_name}</h2>
      </div>
      ${examMeta(report)}
      ${statTiles(report)}
    </div>
    ${report.submissions.length
      ? html`
          <table class="results-table">
            <thead><tr><th scope="col">Student</th><th scope="col">Submitted</th><th scope="col">Score</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`
      : html`<div class="empty-state"><i class="fa-regular fa-hourglass"></i>No submissions yet.</div>`}`;
}

function showOverview() {
  detail.hidden = true;
  overview.hidden = false;
  window.scrollTo({ top: 0 });
}

export async function loadOverview() {
  showOverview();
  const exams = await apiRequest("/analytics/exams");
  setHtml(
    $("#exam-stats"),
    exams.length
      ? exams.map(examCard)
      : html`<div class="empty-state"><i class="fa-solid fa-chart-simple"></i>Exams you create will appear here with their results.</div>`
  );
}

export async function loadReport(examId) {
  const report = await apiRequest(`/analytics/exams/${encodeURIComponent(examId)}`);
  setHtml($("#exam-report"), reportView(report));
  overview.hidden = true;
  detail.hidden = false;
  window.scrollTo({ top: 0 });
}

export function initAnalytics() {
  $("#exam-stats").addEventListener("click", (event) => {
    const button = event.target.closest("[data-report]");
    if (button) runTask(() => loadReport(button.dataset.report));
  });
  $("#analytics-back").addEventListener("click", showOverview);
}
