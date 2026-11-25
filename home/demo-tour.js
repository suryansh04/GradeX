// Click-through product tour rendered inside the landing page's browser mockup.
// Markup contract (see index.html): [data-tour] root containing
// [data-tour-url], [data-tour-prev], [data-tour-next], [data-tour-restart],
// [data-tour-screen] (img), [data-tour-hotspot] (button), [data-tour-tip],
// [data-tour-caption], [data-tour-progress] and [data-tour-end].

const SCREEN_DIR = "home/demo/";

export function placement({ x, y, w, h }) {
  const centerX = x + w / 2;
  return {
    side: y + h / 2 > 55 ? "above" : "below",
    align: centerX > 70 ? "end" : centerX < 30 ? "start" : "center",
  };
}

export function initDemoTour(root, steps) {
  const part = (name) => root.querySelector(`[data-tour-${name}]`);
  const url = part("url");
  const screen = part("screen");
  const hotspot = part("hotspot");
  const tip = part("tip");
  const caption = part("caption");
  const progress = part("progress");
  const end = part("end");
  const prev = part("prev");
  const next = part("next");

  // Warm the cache so each step swaps instantly.
  for (const step of steps) new Image().src = `${SCREEN_DIR}${step.screen}.webp`;

  let index = 0;

  function render() {
    const finished = index === steps.length;
    const step = steps[Math.min(index, steps.length - 1)];

    root.dataset.state = finished ? "end" : "step";
    end.hidden = !finished;
    hotspot.hidden = finished;
    tip.hidden = finished;
    prev.disabled = index === 0;
    next.disabled = finished;
    progress.style.setProperty("--progress", `${(index / steps.length) * 100}%`);
    url.textContent = `gradex.com/${step.path}`;

    if (!screen.src.endsWith(`${step.screen}.webp`)) {
      screen.src = `${SCREEN_DIR}${step.screen}.webp`;
    }
    if (finished) {
      caption.textContent = "That's the full loop: from sign-up to graded results.";
      return;
    }

    const { x, y, w, h } = step.hotspot;
    const { side, align } = placement(step.hotspot);
    Object.assign(hotspot.style, { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });
    hotspot.setAttribute("aria-label", `Step ${index + 1} of ${steps.length}: ${step.tip}`);
    tip.dataset.side = side;
    tip.dataset.align = align;
    tip.style.setProperty("--anchor-x", `${align === "start" ? x : align === "end" ? x + w : x + w / 2}%`);
    tip.style.setProperty("--anchor-y", `${side === "above" ? y : y + h}%`);
    tip.textContent = step.tip;
    caption.textContent = `${index + 1}/${steps.length} · ${step.tip}`;

    // Replay the entrance animation for the new step.
    tip.classList.remove("is-entering");
    void tip.offsetWidth;
    tip.classList.add("is-entering");
  }

  function go(to) {
    index = Math.max(0, Math.min(steps.length, to));
    render();
  }

  hotspot.addEventListener("click", () => go(index + 1));
  tip.addEventListener("click", () => go(index + 1));
  next.addEventListener("click", () => go(index + 1));
  prev.addEventListener("click", () => go(index - 1));
  root.querySelectorAll("[data-tour-restart]").forEach((button) => button.addEventListener("click", () => go(0)));

  render();
}
