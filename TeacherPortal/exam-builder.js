/**
 * The "Create" form: exam details plus a list of question cards. Owns the
 * form's markup and validation; does not talk to the API.
 */
import { $, $$ } from "../lib/dom.js";
import { formatMarks } from "../lib/format.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export class ExamBuilder {
  /** @param {(message: string) => void} onError  shows a problem with a chosen file */
  constructor(form, { onError }) {
    this.form = form;
    this.onError = onError;
    this.list = $("#question-list", form);
    this.template = $("#question-template");
    this.totalLabel = $("#total-marks", form);
    this.courseCode = $("#course-code", form);
    this.examName = $("#exam-name", form);
    this.duration = $("#duration", form);

    $("#add-question", form).addEventListener("click", () => this.addQuestion().querySelector("textarea").focus());
    this.list.addEventListener("input", () => this.#updateTotal());
    this.list.addEventListener("click", (event) => this.#onClick(event));
    this.list.addEventListener("change", (event) => event.target.type === "file" && this.#previewImage(event.target));
    // Clear an error as soon as the field is edited.
    form.addEventListener("input", (event) => event.target.removeAttribute("aria-invalid"));
    this.reset();
  }

  get cards() {
    return $$(".question-card", this.list);
  }

  addQuestion() {
    const card = this.template.content.firstElementChild.cloneNode(true);
    this.list.append(card);
    this.#renumber();
    return card;
  }

  reset() {
    this.form.reset();
    this.cards.forEach((card) => this.#removeCard(card));
    this.addQuestion();
    this.#updateTotal();
  }

  /**
   * Checks the form. Returns an error message for the first invalid field (and
   * focuses it), or null when everything is filled in.
   */
  validate() {
    const problems = [
      [this.courseCode, !this.courseCode.value.trim(), "Add a course code."],
      [this.examName, !this.examName.value.trim(), "Add an exam name."],
      [this.duration, this.duration.value && !this.#validDuration(), "The time limit must be 1 to 600 minutes."],
      ...this.cards.flatMap((card, index) => {
        const text = $(".question-text", card);
        const marks = $(".question-marks", card);
        return [
          [text, !text.value.trim(), `Write the text for question ${index + 1}.`],
          [marks, !(Number(marks.value) > 0), `Give question ${index + 1} its marks.`],
        ];
      }),
    ];
    const [field, , message] = problems.find(([, invalid]) => invalid) ?? [];
    if (!field) return null;
    field.setAttribute("aria-invalid", "true");
    field.focus();
    return message;
  }

  /** The exam details, and each question with the image file to upload (if any). */
  values() {
    return {
      course_code: this.courseCode.value.trim(),
      exam_name: this.examName.value.trim(),
      duration_minutes: this.duration.value ? Number(this.duration.value) : null,
      questions: this.cards.map((card, index) => ({
        question_number: index + 1,
        question_text: $(".question-text", card).value.trim(),
        marks: Number($(".question-marks", card).value),
        imageFile: $('input[type="file"]', card).files[0] ?? null,
      })),
    };
  }

  #validDuration() {
    const minutes = Number(this.duration.value);
    return Number.isInteger(minutes) && minutes >= 1 && minutes <= 600;
  }

  #onClick(event) {
    const card = event.target.closest(".question-card");
    if (event.target.closest("[data-remove-question]")) {
      this.#removeCard(card);
      this.#renumber();
      this.#updateTotal();
    } else if (event.target.closest("[data-remove-image]")) {
      this.#clearImage(card);
    }
  }

  #removeCard(card) {
    this.#clearImage(card);
    card.remove();
  }

  #renumber() {
    const cards = this.cards;
    cards.forEach((card, index) => {
      $(".question-chip", card).textContent = `Q${index + 1}.`;
      // Every exam keeps at least one question.
      $("[data-remove-question]", card).hidden = cards.length === 1;
    });
  }

  #updateTotal() {
    const total = this.cards.reduce((sum, card) => sum + (Number($(".question-marks", card).value) || 0), 0);
    this.totalLabel.textContent = formatMarks(total);
  }

  #previewImage(input) {
    const card = input.closest(".question-card");
    const file = input.files[0];
    if (!file) return this.#clearImage(card);
    if (file.size > MAX_IMAGE_BYTES) {
      this.#clearImage(card);
      this.onError("Images must be at most 5 MB.");
      return;
    }
    const preview = $(".image-preview", card);
    const img = $("img", preview);
    URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(file);
    img.alt = `Image for question ${this.cards.indexOf(card) + 1}`;
    preview.hidden = false;
    $(".add-image-btn", card).hidden = true;
  }

  #clearImage(card) {
    const preview = $(".image-preview", card);
    URL.revokeObjectURL($("img", preview).src);
    $('input[type="file"]', card).value = "";
    preview.hidden = true;
    $(".add-image-btn", card).hidden = false;
  }
}
