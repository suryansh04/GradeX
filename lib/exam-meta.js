import { html } from "./dom.js";
import { formatDuration, formatMarkCount, pluralize } from "./format.js";

/** "⏱ 30 min · 3 questions · 10 marks", shared by the exam list and analytics. */
export function examMeta(exam) {
  return html`
    <p class="exam-meta">
      <span><i class="fa-regular fa-clock"></i> ${formatDuration(exam.duration_minutes)}</span>
      <span>${pluralize(exam.question_count, "question")}</span>
      <span>${formatMarkCount(exam.total_marks)}</span>
    </p>`;
}
