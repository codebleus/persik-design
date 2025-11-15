/**
 * Tiny OOP wrapper around Inputmask for three masks:
 * - [data-tel-mask]   → "+7 (999) 999-99-99" with error state on incomplete
 * - [data-mail-mask]  → alias: "email" with _incomplete state toggle
 * - [data-name-mask]  → regex: "Firstname Lastname" (latin/cyrillic, single space)
 *
 * SOLID-ish breakdown:
 * - FieldState: minimal DOM state helper (no knowledge of masks)
 * - MaskStrategy: per-mask configuration/behavior (open–closed for extension)
 * - InputMaskManager: orchestrates scanning DOM, applying masks, cleanup
 *
 * Public API:
 *   const manager = new InputMaskManager(); manager.init();
 *   manager.destroy(); // removes masks and listeners
 */

import Inputmask from "../../../node_modules/inputmask/dist/inputmask.es6.js";

class FieldState {
  static closestField(el) {
    return el?.closest?.(".field") || null;
  }
  static add(el, cls) {
    const field = FieldState.closestField(el);
    if (field) field.classList.add(cls);
  }
  static remove(el, cls) {
    const field = FieldState.closestField(el);
    if (field) field.classList.remove(cls);
  }
}

class MaskStrategy {
  constructor() {
    /** @type {Array<HTMLInputElement>} */
    this.bound = [];
  }
  apply(input) {}
  track(input) {
    this.bound.push(input);
  }
  destroy() {
    this.bound.forEach((el) => {
      try {
        Inputmask.remove(el);
      } catch {}
    });
    this.bound = [];
  }
}

class TelMaskStrategy extends MaskStrategy {
  apply(input) {
    const onincomplete = () => {
      input.value = "";
      FieldState.add(input, "_has-error");
    };
    const oncomplete = () => {
      FieldState.remove(input, "_has-error");
    };
    Inputmask({
      mask: "+7 (999) 999-99-99",
      showMaskOnHover: false,
      showMaskOnFocus: true,
      jitMasking: false,
      clearIncomplete: true,
      placeholder: "_",
      onincomplete,
      oncomplete,
    }).mask(input);
    this.track(input);
  }
}

class MailMaskStrategy extends MaskStrategy {
  apply(input) {
    const onincomplete = () => FieldState.add(input, "_incomplete");
    const oncomplete = () => FieldState.remove(input, "_incomplete");
    Inputmask({
      showMaskOnHover: false,
      jitMasking: true,
      clearMaskOnLostFocus: true,
      clearIncomplete: true,
      alias: "email",
      onincomplete,
      oncomplete,
    }).mask(input);
    this.track(input);
  }
}

class NameMaskStrategy extends MaskStrategy {
  apply(input) {
    Inputmask({
      showMaskOnHover: false,
      jitMasking: true,
      regex: "^[а-яА-Яa-zA-Z]*[ ][а-яА-Яa-zA-Z]*$",
    }).mask(input);
    this.track(input);
  }
}

export class InputMaskManager {
  /**
   * @param {Object} [opts]
   * @param {ParentNode} [opts.root=document]
   * @param {string} [opts.telSel='[data-tel-mask]']
   * @param {string} [opts.mailSel='[data-mail-mask]']
   * @param {string} [opts.nameSel='[data-name-mask]']
   * @param {MaskStrategy} [opts.telStrategy]
   * @param {MaskStrategy} [opts.mailStrategy]
   * @param {MaskStrategy} [opts.nameStrategy]
   */
  constructor(opts = {}) {
    this.root = opts.root || document;

    this.selectors = {
      tel: opts.telSel || "[data-tel-mask]",
      mail: opts.mailSel || "[data-mail-mask]",
      name: opts.nameSel || "[data-name-mask]",
    };

    this.strategies = {
      tel: opts.telStrategy || new TelMaskStrategy(),
      mail: opts.mailStrategy || new MailMaskStrategy(),
      name: opts.nameStrategy || new NameMaskStrategy(),
    };

    /** @type {HTMLElement[]} */
    this.applied = [];
  }

  init() {
    const tel = this.root.querySelectorAll(this.selectors.tel);
    const mail = this.root.querySelectorAll(this.selectors.mail);
    const name = this.root.querySelectorAll(this.selectors.name);

    if (!tel.length && !mail.length && !name.length) return;

    tel.forEach((el) => this.strategies.tel.apply(el));
    mail.forEach((el) => this.strategies.mail.apply(el));
    name.forEach((el) => this.strategies.name.apply(el));
  }

  destroy() {
    this.strategies.tel.destroy();
    this.strategies.mail.destroy();
    this.strategies.name.destroy();
  }

  /** Convenience: one-liner bootstrap */
  static bootstrap(root = document) {
    const mgr = new InputMaskManager({ root });
    mgr.init();
    return mgr;
  }
}
