import Lenis from "lenis";
import "lenis/dist/lenis.css";

export class LenisScroller {
  constructor(options) {
    this.lenis = new Lenis({
      offset: [0, 0],
      repeat: false,
      smooth: false,
      initPosition: { x: 0, y: 0 },
      direction: "vertical",
      gestureDirection: "vertical",
      reloadOnContextChange: false,
      lerp: 0.1,
      class: "is-inview",
      scrollbarContainer: false,
      scrollbarClass: "c-scrollbar",
      scrollingClass: "has-scroll-scrolling",
      draggingClass: "has-scroll-dragging",
      smoothClass: "has-scroll-smooth",
      initClass: "has-scroll-init",
      getSpeed: false,
      getDirection: false,
      scrollFromAnywhere: false,
      multiplier: 1,
      firefoxMultiplier: 50,
      touchMultiplier: 2,
      resetNativeScroll: true,
      tablet: {
        smooth: false,
        direction: "vertical",
        gestureDirection: "vertical",
        breakpoint: 1024,
      },
      smartphone: {
        smooth: false,
        direction: "vertical",
        gestureDirection: "vertical",
      },
      ...(options || {}),
    });

    this.listeners = new Set();
    this.lenis.on("scroll", () => {
      this.listeners.forEach((l) => l());
    });
  }

  onScroll(cb) {
    this.listeners.add(cb);
  }

  offScroll(cb) {
    this.listeners.delete(cb);
  }

  scrollTo(y, opts) {
    this.lenis.scrollTo(y, { immediate: !!(opts && opts.immediate) });
  }

  getY() {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  raf(timeMs) {
    this.lenis.raf(timeMs);
  }

  start() {
    this.lenis.start();
  }

  stop() {
    this.lenis.stop();
  }

  destroy() {
    this.listeners.clear();
  }
}

export class GsapTicker {
  constructor() {
    gsap.registerPlugin(ScrollTrigger);
  }

  add(cb) {
    gsap.ticker.add(cb);
  }

  remove(cb) {
    gsap.ticker.remove(cb);
  }

  setLagSmoothing(threshold, adjustedLag = 0) {
    gsap.ticker.lagSmoothing(threshold, adjustedLag);
  }
}

export class ScrollTriggerSync {
  constructor(root, scroller) {
    this.root = root;
    this.scroller = scroller;
  }

  setup() {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.scrollerProxy(this.root, {
      scrollTop: (value) => {
        if (typeof value === "number") {
          this.scroller.scrollTo(value, { immediate: true });
        }
        return this.scroller.getY();
      },
      getBoundingClientRect: () => ({
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      }),
      pinType: "fixed",
    });
    ScrollTrigger.defaults({ scroller: this.root });
  }

  update() {
    ScrollTrigger.update();
  }

  destroy() {
    ScrollTrigger.killAll(false);
  }
}

function initHeaderVisibility() {
  if (!document.querySelector(".hero")) return;

  const header = document.querySelector(".header");
  const second = document.querySelector(".cases");
  if (!header || !second) return;

  header.classList.add("_is-hidden");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          header.classList.remove("_is-hidden");
        }
      });
    },
    {
      rootMargin: "0px 0px -99% 0px",
      threshold: 0,
    }
  );

  observer.observe(second);
}

function createRevealAnimations() {
  const items = [...document.querySelectorAll(".reveal")];
  const groups = [...document.querySelectorAll("[data-stagger]")];
  const groupMap = new Map();

  groups.forEach((group) => {
    const delay = parseFloat(group.dataset.stagger) || 0;
    const children = [...group.querySelectorAll(".reveal")];
    children.forEach((el, i) => {
      groupMap.set(el, i * delay);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;

          if (groupMap.has(el)) {
            el.style.transitionDelay = `${groupMap.get(el)}s`;
          }

          el.classList.add("_visible");
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.2 }
  );

  items.forEach((el) => observer.observe(el));
}

export class SmoothScrollManager {
  constructor(params) {
    const p = params || {};
    const root = p.root || document.documentElement;

    this.scroller = p.scroller || new LenisScroller(p.lenisOptions);

    this.onScrollCb = () => {
      if (typeof p.onExternalScrollUpdate === "function")
        p.onExternalScrollUpdate();
    };

    this.onTickCb = (t) => {
      this.scroller.raf(t * 1000);
    };
  }

  init() {
    this.scroller.onScroll(this.onScrollCb);
    this.scroller.start();

    createRevealAnimations();
    initHeaderVisibility();

    const loop = (t) => {
      this.scroller.raf(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.scroller.stop();
  }

  start() {
    this.scroller.start();
  }

  destroy() {
    this.scroller.offScroll(this.onScrollCb);
    this.scroller.destroy();
  }
}
