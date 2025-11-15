/**
 * @file NavMenu: adaptive submenu with a single matchMedia.
 *
 * Desktop (>= 48.01em):
 * - Hover on `.header__nav-item` makes it the only active item.
 *
 * Mobile (< 48em):
 * - Click on `.nav-item__btn` toggles the active state on its own item and removes it from others.
 *
 * Minimum markup:
 *     <li class="header__nav-item">
 *       <button class="nav-item__btn" type="button">Catalog</button>
 *     </li>
 *
 * Accessibility (A11y):
 * - Mobile click logic does not break keyboard navigation.
 * - Can be extended if needed: set `aria-expanded` on the button and `aria-hidden` on the submenu.
 */

/**
 * Small set of utilities without external dependencies.
 * Contains only actually reusable helpers.
 * Stateless and safe for SSR.
 */
export const U = {
  /** querySelector */
  qs(sel, root = document) {
    return root.querySelector(sel);
  },

  /** querySelectorAll → Array */
  qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  },

  /** Safe closest */
  closest(el, sel) {
    return el && el.closest ? el.closest(sel) : null;
  },

  /**
   * Deep plain object merge.
   */
  merge(base, extra) {
    const out = { ...base };
    for (const k in extra) {
      const v = extra[k];
      if (isPlainObject(v) && isPlainObject(out[k])) {
        out[k] = U.merge(out[k], v);
      } else {
        out[k] = v;
      }
    }
    return out;

    function isPlainObject(o) {
      if (!o || typeof o !== "object") return false;
      if (Array.isArray(o)) return false;
      const proto = Object.getPrototypeOf(o);
      return proto === Object.prototype || proto === null;
    }
  },

  /** Add / remove / check class */
  addClass(el, c) {
    el && el.classList.add(c);
  },
  removeClass(el, c) {
    el && el.classList.remove(c);
  },
  hasClass(el, c) {
    return !!(el && el.classList.contains(c));
  },

  /**
   * Makes the target the only active element among items.
   * @param {HTMLElement[]} items
   * @param {HTMLElement|null} target
   * @param {string} className
   */
  setExclusiveActive(items, target, className) {
    items.forEach((i) =>
      i === target ? U.addClass(i, className) : U.removeClass(i, className)
    );
  },

  /**
   * Event delegation: adds a listener to container and calls handler
   * when the bubbled event target matches the selector.
   * @param {HTMLElement} container
   * @param {keyof HTMLElementEventMap} type
   * @param {string} selector
   * @param {(e:Event, matched:HTMLElement)=>void} handler
   * @param {AddEventListenerOptions|boolean} [options]
   * @returns {() => void} unsubscribe function
   */
  delegate(container, type, selector, handler, options) {
    const wrapped = (e) => {
      const match = U.closest(e.target, selector);
      if (!match || !container.contains(match)) return;
      handler(e, match);
    };
    container.addEventListener(type, wrapped, options);
    return () => container.removeEventListener(type, wrapped, options);
  },

  /**
   * matchMedia wrapper: subscribe + immediate onChange call.
   * @param {string} query CSS media query (e.g. '(min-width: 48.01em)')
   * @param {(matches:boolean)=>void} onChange
   * @returns {{mql: MediaQueryList, destroy: ()=>void}}
   */
  mediaQuery(query, onChange) {
    const mql = window.matchMedia(query);
    const cb = () => onChange(mql.matches);

    if (mql.addEventListener) mql.addEventListener("change", cb);
    else mql.addListener(cb);

    onChange(mql.matches);

    return {
      mql,
      destroy() {
        if (mql.removeEventListener) mql.removeEventListener("change", cb);
        else mql.removeListener(cb);
      },
    };
  },
};
