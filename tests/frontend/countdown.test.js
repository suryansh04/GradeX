import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { startCountdown } from "../../lib/countdown.js";

test("ticks every second and ends once", () => {
  mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
  const ticks = [];
  let ended = 0;
  startCountdown({ endsAt: 2500, onTick: (left) => ticks.push(left), onEnd: () => (ended += 1) });

  for (let second = 0; second < 5; second += 1) mock.timers.tick(1000);
  assert.deepEqual(ticks, [2500, 1500, 500, 0]);
  assert.equal(ended, 1);
  mock.timers.reset();
});

test("stop function halts the countdown", () => {
  mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
  let ended = false;
  const stop = startCountdown({ endsAt: 1500, onTick: () => {}, onEnd: () => (ended = true) });
  stop();
  mock.timers.tick(5000);
  assert.equal(ended, false);
  mock.timers.reset();
});
