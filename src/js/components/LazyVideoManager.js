import { U } from "../functions/utils.js";

/**
 * Lazy Videos (OOP + SOLID, no TS; documented & JSDoc-typed).
 * Loads <video> sources only when needed (viewport or user interaction).
 *
 * Markup example:
 * <video class="showreel__video" playsinline preload="none" data-lazy data-autoplay data-root-margin="200px">
 *   <source data-src="/media/clip.webm" type="video/webm">
 *   <source data-src="/media/clip.mp4"  type="video/mp4">
 * </video>
 */

/** @typedef {"viewport"|"interaction"|"manual"} ActivationMode */

/**
 * @typedef {Object} LazyVideoOptions
 * @property {ActivationMode} [mode="viewport"] Activation mode.
 * @property {string} [rootMargin="200px 0px"] IO rootMargin (viewport mode).
 * @property {number} [threshold=0] IO threshold (viewport mode).
 * @property {boolean} [once=true] Unobserve after first activation.
 * @property {boolean} [autoplay=false] Try to autoplay (muted+inline recommended).
 */

/** Separates concerns: knowing a video element vs. loading it. */
class VideoElement {
  /** @param {HTMLVideoElement} el */
  constructor(el) {
    this.el = el;
  }
  /** @returns {HTMLSourceElement[]} */
  getSources() {
    return Array.from(this.el.querySelectorAll("source"));
  }
  /** @returns {boolean} */
  hasNativeSrc() {
    return (
      typeof this.el.currentSrc === "string" && this.el.currentSrc.length > 0
    );
  }
  /** @returns {boolean} */
  isLoaded() {
    return this.el.readyState >= 1;
  }
  /** @returns {Promise<void>} */
  load() {
    this.el.load();
    return Promise.resolve();
  }
  /** @returns {Promise<void>} */
  async autoplay() {
    try {
      await this.el.play();
    } catch (_) {}
  }
}

/** Single responsibility: move data-src → src. */
class SourceLoader {
  /**
   * @param {VideoElement} ve
   * @returns {boolean} true if any source was set
   */
  loadSources(ve) {
    let changed = false;
    for (const s of ve.getSources()) {
      const data = s.getAttribute("data-src");
      if (data && s.src !== data) {
        s.src = data;
        changed = true;
      }
    }
    // Also support <video data-src="..."> pattern
    const videoData = ve.el.getAttribute("data-src");
    if (videoData && ve.el.src !== videoData) {
      ve.el.src = videoData;
      changed = true;
    }
    return changed;
  }
}

/** Interface for activation strategies. */
class ActivationStrategy {
  /** @param {() => void} _onActivate */ // eslint-disable-line
  attach(_onActivate) {
    throw new Error("Not implemented");
  }
  detach() {
    /* optional */
  }
}

/** Triggers when element comes near viewport. */
class ViewportActivation extends ActivationStrategy {
  /**
   * @param {Element} target
   * @param {{rootMargin:string, threshold:number, once:boolean}} cfg
   */
  constructor(target, { rootMargin, threshold, once }) {
    super();
    this.target = target;
    this.once = once;
    this.io = new IntersectionObserver(
      (ents) => {
        for (const e of ents) {
          if (e.isIntersecting || e.intersectionRatio > 0) {
            this.onActivate?.();
            if (this.once) this.detach();
            break;
          }
        }
      },
      { root: null, rootMargin, threshold }
    );
  }
  /** @param {() => void} onActivate */
  attach(onActivate) {
    this.onActivate = onActivate;
    this.io.observe(this.target);
  }
  detach() {
    this.io.disconnect();
  }
}

/** Triggers on first user interaction (hover/click/touch). */
class InteractionActivation extends ActivationStrategy {
  /** @param {Element} target */
  constructor(target) {
    super();
    this.target = target;
    this.bound = () => {
      this.onActivate?.();
      this.detach();
    };
  }
  /** @param {() => void} onActivate */
  attach(onActivate) {
    this.onActivate = onActivate;
    const t = this.target;
    t.addEventListener("pointerenter", this.bound, { once: true });
    t.addEventListener("click", this.bound, { once: true });
    t.addEventListener("touchstart", this.bound, { once: true, passive: true });
  }
  detach() {
    const t = this.target;
    t.removeEventListener("pointerenter", this.bound);
    t.removeEventListener("click", this.bound);
    t.removeEventListener("touchstart", this.bound);
  }
}

/** High-level orchestrator (DIP: depends on abstractions). */
class LazyVideo {
  /**
   * @param {HTMLVideoElement} el
   * @param {LazyVideoOptions} options
   * @param {SourceLoader} loader
   * @param {ActivationStrategy} strategy
   */
  constructor(el, options, loader, strategy) {
    this.ve = new VideoElement(el);
    this.options = options;
    this.loader = loader;
    this.strategy = strategy;
    this.activated = false;
  }

  init() {
    this.strategy.attach(() => this.activate());
    return this;
  }

  async activate() {
    if (this.activated) return;
    this.activated = true;

    const changed = this.loader.loadSources(this.ve);
    if (changed || !this.ve.isLoaded() || !this.ve.hasNativeSrc()) {
      await this.ve.load();
    }

    if (this.options.autoplay || this.ve.el.hasAttribute("data-autoplay")) {
      // Autoplay best-effort; ensure muted+playsinline for mobile.
      if (!this.ve.el.hasAttribute("muted")) this.ve.el.muted = true;
      if (!this.ve.el.hasAttribute("playsinline"))
        this.ve.el.setAttribute("playsinline", "");
      await this.ve.autoplay();
    }
  }

  destroy() {
    this.strategy.detach();
  }
}

/** Facade: bootstraps all lazy videos on the page. */
export class LazyVideoManager {
  /**
   * @param {Partial<LazyVideoOptions>} [defaults]
   */
  constructor(defaults) {
    /** @type {LazyVideoOptions} */
    this.defaults = {
      mode: "viewport",
      rootMargin: "200px 0px",
      threshold: 0,
      once: true,
      autoplay: false,
      ...defaults,
    };
    /** @type {LazyVideo[]} */
    this.instances = [];
  }

  /**
   * Finds <video data-lazy> and initializes them.
   * @param {ParentNode} [root=document]
   */
  mount(root = document) {
    const nodes = /** @type {NodeListOf<HTMLVideoElement>} */ (
      root.querySelectorAll("video[data-lazy]")
    );
    for (const el of nodes) {
      const opts = this._mergeOptionsFromAttrs(el);
      const loader = new SourceLoader();
      const strategy = this._buildStrategy(el, opts);
      const inst = new LazyVideo(el, opts, loader, strategy).init();
      this.instances.push(inst);
    }
  }

  destroy() {
    for (const inst of this.instances) inst.destroy();
    this.instances = [];
  }

  /** @private */
  _buildStrategy(el, opts) {
    if (opts.mode === "interaction") return new InteractionActivation(el);
    if (opts.mode === "manual") {
      // Manual: a no-op strategy; user calls .activate() via returned instance if needed.
      return new (class extends ActivationStrategy {
        attach() {}
        detach() {}
      })();
    }
    return new ViewportActivation(el, {
      rootMargin: opts.rootMargin,
      threshold: opts.threshold,
      once: opts.once,
    });
  }

  /** @private */
  _mergeOptionsFromAttrs(el) {
    /** @type {LazyVideoOptions} */
    const o = { ...this.defaults };
    const mode = el.getAttribute("data-mode"); // "viewport" | "interaction" | "manual"
    const rm = el.getAttribute("data-root-margin");
    const th = el.getAttribute("data-threshold");
    const once = el.getAttribute("data-once");
    const ap = el.getAttribute("data-autoplay");

    if (mode === "viewport" || mode === "interaction" || mode === "manual")
      o.mode = mode;
    if (rm) o.rootMargin = rm;
    if (th != null && th !== "") o.threshold = Number(th);
    if (once != null && once !== "") o.once = once !== "false";
    if (ap != null && ap !== "") o.autoplay = true;
    return o;
  }
}
