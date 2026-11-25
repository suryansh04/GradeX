import assert from "node:assert/strict";
import { test } from "node:test";

import { splitAnswers } from "../../TeacherPortal/answer-sheet.js";

test("splits numbered answers in order", () => {
  assert.deepEqual(splitAnswers("A1) First answer. A2) Second answer."), ["First answer.", "Second answer."]);
});

test("keeps an answer that continues onto the next page", () => {
  const twoPages = ["A1) Starts on page one", "and ends on page two. A2) Next."].join(" ");
  assert.deepEqual(splitAnswers(twoPages), ["Starts on page one and ends on page two.", "Next."]);
});

test("orders by answer number and tolerates spacing", () => {
  assert.deepEqual(splitAnswers("A2 ) second A1)first"), ["first", "second"]);
});

test("ignores text before the first marker and returns [] without markers", () => {
  assert.deepEqual(splitAnswers("Answer key A1) one"), ["one"]);
  assert.deepEqual(splitAnswers("no markers here"), []);
});
