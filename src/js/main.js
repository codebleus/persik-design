import { LazyVideoManager } from "./components/LazyVideoManager.js";

const lvm = new LazyVideoManager({
  mode: "viewport",
  rootMargin: "300px 0px",
  autoplay: false,
});

document.addEventListener("DOMContentLoaded", function () {
  lvm.mount();

  let belowLoaded = false;
  function loadBelowFold() {
    if (belowLoaded) return;
    belowLoaded = true;
    import("./below-fold.js").catch(err =>
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

  ["scroll", "mousemove", "touchstart", "pointerdown", "keydown"].forEach(ev =>
    window.addEventListener(ev, loadBelowFold, { once: true, passive: true })
  );

  setTimeout(loadBelowFold, 8000);
});
