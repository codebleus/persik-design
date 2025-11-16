import { BreakpointMover, createRules } from "./components/BreakpointMover.js";
import { LazyVideoManager } from "./components/LazyVideoManager.js";
import { SmoothScrollManager } from "./components/SmoothScrollController.js";

const lvm = new LazyVideoManager({
  mode: "viewport",
  rootMargin: "300px 0px",
  autoplay: false,
});

/* lenis instance */
export const lenis = new SmoothScrollManager({
  root: document.documentElement,
});

// ScrollTrigger.refresh();
lenis.init();

document.addEventListener("DOMContentLoaded", function () {
  lvm.mount();

  new BreakpointMover(createRules()).init();

  let belowLoaded = false;
  function loadBelowFold() {
    if (belowLoaded) return;
    belowLoaded = true;
    import("./below-fold.js").catch((err) =>
      console.warn("[below-fold] failed to load:", err?.message || err)
    );
  }

  window.addEventListener("load", () => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(loadBelowFold, { timeout: 1200 });
    } else {
      setTimeout(loadBelowFold, 1200);
    }
  });

  ["scroll", "mousemove", "touchstart", "pointerdown", "keydown"].forEach(
    (ev) =>
      window.addEventListener(ev, loadBelowFold, { once: true, passive: true })
  );

  setTimeout(loadBelowFold, 8000);
});
