import assert from "node:assert/strict";
import { test } from "node:test";

import { DEMO_STEPS } from "../../home/demo-steps.js";
import { placement } from "../../home/demo-tour.js";

test("tip sits above low hotspots and below high ones", () => {
  assert.equal(placement({ x: 40, y: 80, w: 10, h: 5 }).side, "above");
  assert.equal(placement({ x: 40, y: 10, w: 10, h: 5 }).side, "below");
});

test("tip is aligned so it stays inside the screen", () => {
  assert.equal(placement({ x: 85, y: 50, w: 10, h: 5 }).align, "end");
  assert.equal(placement({ x: 5, y: 50, w: 10, h: 5 }).align, "start");
  assert.equal(placement({ x: 45, y: 50, w: 10, h: 5 }).align, "center");
});

test("every demo hotspot lies within its screen", () => {
  for (const { screen, hotspot } of DEMO_STEPS) {
    const { x, y, w, h } = hotspot;
    assert.ok(x >= 0 && y >= 0 && x + w <= 100 && y + h <= 100, `${screen} hotspot is off-screen`);
  }
});
