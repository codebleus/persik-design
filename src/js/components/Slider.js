import Swiper from "swiper";
import { U } from "../functions/utils.js";

/**
 * @typedef {import('swiper').Swiper} SwiperInstance
 * @typedef {import('swiper').SwiperOptions} SwiperOptions
 */

/**
 * @typedef ThumbsInput
 * @property {HTMLElement} swiperEl
 * @property {number | 'auto'} [slidesPerView]
 * @property {number} [spaceBetween]
 * @property {SwiperOptions} [options]
 */

/**
 * full stack of options for Slider component:
 * it's SwiperOptions + modules + thumbs-entry
 * @typedef {SwiperOptions & {
 *   modules?: any[],
 *   thumbs?: ThumbsInput | { swiper: SwiperInstance }
 * }} SliderOptions
 */

export class Slider {
  /**
   * main slider component
   * @param {string|HTMLElement} selector
   * @param {SliderOptions} [options={}]
   */
  constructor(selector, options = {}) {
    /** @type {HTMLElement|null} */
    this.el = typeof selector === "string" ? U.qs(selector) : selector;

    if (!this.el) {
      throw new Error("Slider: container is not found");
    }

    /** @type {SliderOptions} */
    const DEFAULTS = {
      modules: [],
    };

    /** @type {SliderOptions} */
    this.options = { modules: [], ...options };

    /** @type {SwiperInstance|null} */
    this.instance = null;

    /** @type {SwiperInstance|null} */
    this.thumbs = null;
  }

  /**
   * initialisation
   * @returns {this}
   */
  init() {
    const SwiperCtor = Swiper && Swiper.default ? Swiper.default : Swiper;

    if (this.options.thumbs?.swiperEl) {
      this.thumbs = new SwiperCtor(this.options.thumbs.swiperEl, {
        ...this.options,
        modules: this.options.modules || [],
        slidesPerView: this.options.thumbs.slidesPerView || "auto",
        spaceBetween: this.options.thumbs.spaceBetween || 8,
        watchSlidesProgress: true,
        watchSlidesVisibility: true,
        freeMode: true,
        ...(this.options.thumbs.options || {}),
      });
      this.options.thumbs = { swiper: this.thumbs };
    }

    this.instance = new SwiperCtor(this.el, {
      ...this.options,
      modules: this.options.modules || [],
    });

    this._bindEvents();
    return this;
  }

  /**
   * base events bind
   * @private
   */
  _bindEvents() {
    if (!this.instance) return;

    // this.instance.on('slideChange', () => {
    //   this.el?.dispatchEvent(new CustomEvent('slider:change', {
    //     detail: { index: this.instance.realIndex }
    //   }));
    // });
    //
    // this.instance.on('reachEnd', () => {
    //   this.el?.dispatchEvent(new CustomEvent('slider:reachEnd'));
    // });
  }

  /**
   * @returns {this}
   */
  next() {
    this.instance?.slideNext();
    return this;
  }

  /**
   * @returns {this}
   */
  prev() {
    this.instance?.slidePrev();
    return this;
  }

  /**
   * @param {number} i
   * @returns {this}
   */
  goTo(i) {
    this.instance?.slideTo(i);
    return this;
  }

  /**
   * @returns {this}
   */
  update() {
    this.instance?.update();
    return this;
  }

  /**
   * @returns {this}
   */
  start() {
    this.instance?.autoplay?.start();
    return this;
  }

  /**
   * @returns {this}
   */
  stop() {
    this.instance?.autoplay?.stop();
    return this;
  }

  /**
   * destroy
   * @returns {void}
   */
  destroy() {
    this.thumbs?.destroy(true, true);
    this.instance?.destroy(true, true);
    this.thumbs = null;
    this.instance = null;
  }
}
