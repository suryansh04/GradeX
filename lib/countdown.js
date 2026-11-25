/**
 * Calls onTick(msLeft) every second until `endsAt` (ms since epoch, local clock),
 * then onEnd() once. Returns a function that stops the countdown.
 */
export function startCountdown({ endsAt, onTick, onEnd }) {
  let timer;
  const tick = () => {
    const left = endsAt - Date.now();
    onTick(Math.max(0, left));
    if (left <= 0) {
      clearInterval(timer);
      onEnd();
    }
  };
  timer = setInterval(tick, 1000);
  tick();
  return () => clearInterval(timer);
}
