/**
 * One student's attempt at an exam: its answers, autosaving them to the server,
 * the deadline, and submitting. Knows nothing about the page's markup.
 */
import { apiRequest, isConflict } from "../lib/api.js";

const AUTOSAVE_DELAY_MS = 1500;

export const SaveStatus = Object.freeze({
  SAVED: "saved",
  UNSAVED: "unsaved",
  SAVING: "saving",
  FAILED: "failed",
});

export class ExamSession {
  /** Starts the attempt, or resumes it if the student already started. */
  static async start(examId) {
    const requestedAt = Date.now();
    const attempt = await apiRequest(`/exams/${encodeURIComponent(examId)}/attempt`, { method: "POST" });
    return new ExamSession(attempt, requestedAt);
  }

  constructor(attempt, requestedAt) {
    this.id = attempt.submission_id;
    this.exam = attempt.exam;
    this.answers = [...attempt.answers];
    this.onStatusChange = () => {};
    // Called when the server refuses a save because the attempt has closed (e.g. time is up).
    this.onAttemptClosed = () => {};
    this.status = SaveStatus.SAVED;
    this.saveTimer = null;
    this.pendingSave = null;

    // Express the deadline on this device's clock, which may differ from the server's.
    const clockOffset = new Date(attempt.server_time).getTime() - requestedAt;
    this.endsAt = attempt.deadline ? new Date(attempt.deadline).getTime() - clockOffset : null;
  }

  get isTimed() {
    return this.endsAt !== null;
  }

  get hasUnsavedChanges() {
    return this.status !== SaveStatus.SAVED;
  }

  isAnswered(index) {
    return this.answers[index].trim() !== "";
  }

  get unansweredCount() {
    return this.answers.filter((_, index) => !this.isAnswered(index)).length;
  }

  setAnswer(index, text) {
    this.answers[index] = text;
    this.#setStatus(SaveStatus.UNSAVED);
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), AUTOSAVE_DELAY_MS);
  }

  /** Saves now if there are changes. `keepalive` lets the request outlive the page. */
  async save({ keepalive = false } = {}) {
    clearTimeout(this.saveTimer);
    if (this.status === SaveStatus.SAVED) return;
    await this.pendingSave; // Keep saves in order; it never rejects.

    const answers = [...this.answers];
    this.#setStatus(SaveStatus.SAVING);
    this.pendingSave = apiRequest(`/submissions/${this.id}/answers`, {
      method: "PUT",
      json: { answers },
      keepalive,
    })
      .then(() => {
        // Typing may have continued while this request was in flight.
        const changed = answers.some((answer, i) => answer !== this.answers[i]);
        this.#setStatus(changed ? SaveStatus.UNSAVED : SaveStatus.SAVED);
      })
      .catch((error) => {
        this.#setStatus(SaveStatus.FAILED);
        if (isConflict(error)) {
          this.onAttemptClosed(error);
        } else {
          // Probably a network blip: try again shortly.
          this.saveTimer = setTimeout(() => this.save(), AUTOSAVE_DELAY_MS * 4);
        }
      });
    return this.pendingSave;
  }

  /** Submits the current answers. Resolves to the server's SubmitResult. */
  async submit() {
    clearTimeout(this.saveTimer);
    await this.pendingSave;
    const result = await apiRequest(`/submissions/${this.id}/submit`, {
      method: "POST",
      json: { answers: this.answers },
    });
    this.#setStatus(SaveStatus.SAVED);
    return result;
  }

  #setStatus(status) {
    this.status = status;
    this.onStatusChange(status);
  }
}
