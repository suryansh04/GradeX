import assert from "node:assert/strict";
import { test } from "node:test";

import { formatCountdown, formatDuration, formatMarkCount, formatMarks, pluralize } from "../../lib/format.js";

test("formatDuration", () => {
  assert.equal(formatDuration(null), "No time limit");
  assert.equal(formatDuration(45), "45 min");
  assert.equal(formatDuration(60), "1 h");
  assert.equal(formatDuration(90), "1 h 30 min");
});

test("formatMarks trims trailing decimals", () => {
  assert.equal(formatMarks(4), "4");
  assert.equal(formatMarks(2.5), "2.5");
  assert.equal(formatMarks(10 / 3), "3.33");
});

test("pluralize and formatMarkCount", () => {
  assert.equal(pluralize(1, "question"), "1 question");
  assert.equal(pluralize(0, "question"), "0 questions");
  assert.equal(formatMarkCount(1), "1 mark");
  assert.equal(formatMarkCount(2.5), "2.5 marks");
});

test("formatCountdown", () => {
  assert.equal(formatCountdown(65_000), "01:05");
  assert.equal(formatCountdown(3_725_000), "1:02:05");
  assert.equal(formatCountdown(400), "00:01", "rounds partial seconds up");
  assert.equal(formatCountdown(-5_000), "00:00", "never negative");
});
