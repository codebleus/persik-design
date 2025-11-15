import { U } from "../functions/utils.js";

export class NavMenu {
  /**
   * @param {HTMLElement} root
   * @param {Object} [opts]
   * @param {string} [opts.itemSel='.header__nav-item']
   * @param {string} [opts.btnSel='.nav-item__btn']
   * @param {string} [opts.activeCl='_is-active']
   * @param {string} [opts.mq='(min-width: 48.01em)']
   * @param {boolean} [opts.clearOnLeave=true]
   * @param {boolean} [opts.escToClear=true]
   */
  constructor(
    root,
    {
      itemSel = ".header__nav-item",
      btnSel = ".nav-item__btn",
      activeCl = "_is-active",
      mq = "(min-width: 48.01em)",
      clearOnLeave = true,
      escToClear = true,
    } = {}
  ) {
    this.root = root;
    this.itemSel = itemSel;
    this.btnSel = btnSel;
    this.activeCl = activeCl;
    this.clearOnLeave = clearOnLeave;
    this.escToClear = escToClear;

    this._unsubs = [];
    this._mode = null;

    this._animMap = new WeakMap();
    this._currentDesktopActive = null;

    this._mqCtl = U.mediaQuery(mq, (matches) => {
      this._switchMode(matches ? "desktop" : "mobile");
    });
  }

  get items() {
    return U.qsa(this.itemSel, this.root);
  }

  _switchMode(mode) {
    if (this._mode === mode) return;
    this._teardown();
    this._mode = mode;
    if (mode === "desktop") this._setupDesktop();
    else this._setupMobile();
    this.items.forEach((i) => U.removeClass(i, this.activeCl));
    this._currentDesktopActive = null;
  }

  _teardown() {
    this._unsubs.forEach((off) => {
      try {
        off();
      } catch (_) {}
    });
    this._unsubs = [];
    // kill gsap on submenu items
    this.items.forEach((i) => this._cleanupSubmenu(i, true));
  }

  /* ===== Desktop (stagger on submenu) ===== */
  _setupDesktop() {
    const offOver = U.delegate(
      this.root,
      "mouseover",
      this.itemSel,
      (e, item) => {
        if (this._currentDesktopActive === item) return;
        const prev = this._currentDesktopActive;
        this._currentDesktopActive = item;

        if (prev && prev !== item) this._cleanupSubmenu(prev);

        U.setExclusiveActive(this.items, item, this.activeCl);
        this._animateSubmenu(item);
      },
      { passive: true }
    );

    let offLeave = () => {};
    if (this.clearOnLeave) {
      const onLeave = (e) => {
        if (!this.root.contains(e.relatedTarget)) {
          this.items.forEach((i) => {
            U.removeClass(i, this.activeCl);
            this._cleanupSubmenu(i);
          });
          this._currentDesktopActive = null;
        }
      };
      this.root.addEventListener("mouseout", onLeave);
      offLeave = () => this.root.removeEventListener("mouseout", onLeave);
    }

    this._unsubs.push(offOver, offLeave);
  }

  _getSubmenuItems(item) {
    // adjust selector if needed
    return U.qsa(".sublist-nav-item__item", item);
  }

  _animateSubmenu(item) {
    const els = this._getSubmenuItems(item);
    if (!els.length) return;

    // kill previous animation on this item if any
    const prevTl = this._animMap.get(item);
    if (prevTl) {
      prevTl.kill();
      this._animMap.delete(item);
    }
    gsap.killTweensOf(els);

    gsap.set(els, { y: 18, autoAlpha: 0 });

    const tl = gsap.to(els, {
      y: 0,
      autoAlpha: 1,
      duration: 0.35,
      ease: "power2.out",
      stagger: 0.06,
      overwrite: "auto",
      paused: false,
    });

    this._animMap.set(item, tl);
  }

  _cleanupSubmenu(item, forceClearProps = false) {
    const tl = this._animMap.get(item);
    if (tl) {
      tl.kill();
      this._animMap.delete(item);
    }
    const els = this._getSubmenuItems(item);
    if (!els.length) return;
    gsap.killTweensOf(els);
    // leave them as-is if submenu is hidden by CSS; otherwise reset quickly
    if (forceClearProps) {
      gsap.set(els, { clearProps: "all" });
    } else {
      gsap.set(els, { y: 0, autoAlpha: 1 }); // safe default when switching items
    }
  }

  /* ===== Mobile ===== */
  _setupMobile() {
    const offClick = U.delegate(this.root, "click", this.btnSel, (e, btn) => {
      e.preventDefault();
      const item = U.closest(btn, this.itemSel);
      if (!item) return;

      const willActivate = !U.hasClass(item, this.activeCl);
      this.items.forEach((i) => {
        U.removeClass(i, this.activeCl);
        this._cleanupSubmenu(i);
      });
      if (willActivate) {
        U.addClass(item, this.activeCl);
        // optional: animate on open in mobile too
        this._animateSubmenu(item);
      }
    });

    let offKey = () => {};
    if (this.escToClear) {
      const onKey = (e) => {
        if (e.key === "Escape") {
          this.items.forEach((i) => {
            U.removeClass(i, this.activeCl);
            this._cleanupSubmenu(i);
          });
        }
      };
      document.addEventListener("keydown", onKey);
      offKey = () => document.removeEventListener("keydown", onKey);
    }

    this._unsubs.push(offClick, offKey);
  }

  _syncA11y(activeItem) {
    const btn = U.qsa(this.btnSel, activeItem)[0];
    const submenu = U.qsa(".nav-item__submenu", activeItem)[0];
    this.items.forEach((i) => {
      const b = U.qsa(this.btnSel, i)[0];
      const s = U.qsa(".nav-item__submenu", i)[0];
      if (b) b.setAttribute("aria-expanded", String(false));
      if (s) s.setAttribute("aria-hidden", String(true));
    });
    if (btn) btn.setAttribute("aria-expanded", String(true));
    if (submenu) submenu.setAttribute("aria-hidden", String(false));
  }

  destroy() {
    this._teardown();
    this._mqCtl.destroy();
  }
}
