/**
 * AccessibleSelect: ARIA-compliant (multi)select using button+listbox.
 * - Multiple selection, keyboard support, outside click, form reset.
 * - Syncs hidden <input> and button label; updates aria-selected/aria-expanded/aria-activedescendant.
 * - Visibility is controlled solely by toggling `_is-active` on the fieldset root.
 */

import { U } from "../functions/utils.js";

export class AccessibleSelect {
  /**
   * @param {HTMLElement} fieldset fieldset[data-select]
   * @param {Partial<{
   *   multiple:boolean,
   *   valueSeparator:string,
   *   renderButtonLabel:(values:string[], labels:string[])=>string,
   *   getOptionValue:(opt:HTMLElement)=>string,
   *   getOptionLabel:(opt:HTMLElement)=>string,
   *   maxLabelItems:number,
   *   closeOnSelect:boolean,
   *   resetButton:HTMLElement|null
   * }>} options
   */
  constructor(fieldset, options = {}) {
    this.root = fieldset;
    this.btn = U.qs(".select__button", fieldset);
    this.popover = U.qs(".select__popover", fieldset);
    this.listbox = U.qs('[role="listbox"]', fieldset);
    this.input = U.qs("input.select__input", fieldset);
    this.options = U.qsa('[role="option"]', this.listbox);

    const defaults = {
      multiple: true,
      valueSeparator: ", ",
      renderButtonLabel: (values, labels) => {
        if (!labels.length)
          return (
            this.btn?.dataset?.placeholder ||
            this.btn.textContent?.trim() ||
            "Select"
          );
        if (!this.opts.multiple) return labels[0];
        const max = this.opts.maxLabelItems;
        return labels.length <= max
          ? labels.join(this.opts.valueSeparator)
          : `${labels.slice(0, max).join(this.opts.valueSeparator)} (+${
              labels.length - max
            })`;
      },
      getOptionValue: (opt) =>
        (opt.dataset.value || opt.textContent || "").trim(),
      getOptionLabel: (opt) => (opt.textContent || "").trim(),
      maxLabelItems: 2,
      closeOnSelect: false,
      resetButton: null,
    };

    // Use a plain shallow merge to avoid deep-cloning DOM.
    this.opts = { ...defaults, ...options };
    if (!this.opts.multiple) this.opts.closeOnSelect = true;

    this.selectedValues = new Set();
    this.activeIndex = -1;
    this.initialButtonText = (this.btn?.textContent || "").trim();

    this._bind();
    this._setupAria();
    this._restoreFromInput();
    this._render();
  }

  open() {
    if (!this.btn) return;
    U.addClass(this.root, "_is-active");
    this.btn.setAttribute("aria-expanded", "true");
    this.listbox && this.listbox.focus();
    if (this.activeIndex < 0) this._moveActive(0);
    document.addEventListener("pointerdown", this._onDocPointerDown, true);
    document.addEventListener("keydown", this._onDocKeyDown, true);
  }

  close() {
    if (!this.btn) return;
    U.removeClass(this.root, "_is-active");
    this.btn.setAttribute("aria-expanded", "false");
    this.btn.focus();
    document.removeEventListener("pointerdown", this._onDocPointerDown, true);
    document.removeEventListener("keydown", this._onDocKeyDown, true);
  }

  toggle() {
    if (U.hasClass(this.root, "_is-active")) this.close();
    else this.open();
  }

  clear() {
    this.selectedValues.clear();
    this.options.forEach((o) => o.setAttribute("aria-selected", "false"));
    this._commitValue();
    this._render();
  }

  choose(index) {
    if (index < 0 || index >= this.options.length) return;
    const opt = this.options[index];
    const val = this.opts.getOptionValue(opt);
    const isSelected = this.selectedValues.has(val);

    if (this.opts.multiple) {
      if (isSelected) this.selectedValues.delete(val);
      else this.selectedValues.add(val);
      opt.setAttribute(
        "aria-selected",
        this.selectedValues.has(val) ? "true" : "false"
      );
    } else {
      this.options.forEach((o) => o.setAttribute("aria-selected", "false"));
      this.selectedValues.clear();
      this.selectedValues.add(val);
      opt.setAttribute("aria-selected", "true");
    }

    this._commitValue();
    this._render();

    if (this.opts.closeOnSelect) this.close();
  }

  destroy() {
    this._unsub?.forEach((fn) => fn());
    document.removeEventListener("pointerdown", this._onDocPointerDown, true);
    document.removeEventListener("keydown", this._onDocKeyDown, true);
  }

  _bind() {
    this._unsub = [];

    this._onButtonClick = (e) => {
      e.preventDefault();
      this.toggle();
    };

    this._onListClick = (e, matched) => {
      e.preventDefault();
      const idx = this.options.indexOf(matched);
      if (idx >= 0) {
        this._setActive(idx);
        this.choose(idx);
      }
    };

    this._onListKeyDown = (e) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          this._moveActive(this.activeIndex + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          this._moveActive(this.activeIndex - 1);
          break;
        case "Home":
          e.preventDefault();
          this._moveActive(0);
          break;
        case "End":
          e.preventDefault();
          this._moveActive(this.options.length - 1);
          break;
        case " ":
        case "Enter":
          e.preventDefault();
          this.choose(this.activeIndex);
          break;
        case "Escape":
          e.preventDefault();
          this.close();
          break;
      }
    };

    this._onDocPointerDown = (e) => {
      if (!this.root.contains(/** @type {Node} */ (e.target))) this.close();
    };

    this._onDocKeyDown = (e) => {
      if (e.key === "Tab") this.close();
    };

    this.btn && this.btn.addEventListener("click", this._onButtonClick);
    if (this.listbox) {
      this._unsub.push(
        U.delegate(this.listbox, "click", '[role="option"]', this._onListClick)
      );
      this.listbox.addEventListener("keydown", this._onListKeyDown);
    }

    const form = this.root.closest("form");
    if (form) {
      form.addEventListener("reset", () => {
        this.clear();
        this.close();
      });
    }

    const externalReset = this.opts.resetButton;
    if (externalReset) {
      externalReset.addEventListener("click", () => {
        this.clear();
        this.close();
      });
    }
  }

  _setupAria() {
    if (!this.listbox) return;
    if (this.opts.multiple)
      this.listbox.setAttribute("aria-multiselectable", "true");
    else this.listbox.removeAttribute("aria-multiselectable");
    if (this.btn) this.btn.setAttribute("aria-expanded", "false");
  }

  _restoreFromInput() {
    const raw = (this.input?.value || "").trim();
    if (!raw) return;
    const vals = raw
      .split(this.opts.valueSeparator)
      .map((s) => s.trim())
      .filter(Boolean);
    vals.forEach((v) => this.selectedValues.add(v));
    this.options.forEach((o) => {
      const v = this.opts.getOptionValue(o);
      o.setAttribute(
        "aria-selected",
        this.selectedValues.has(v) ? "true" : "false"
      );
    });
  }

  _commitValue() {
    const values = Array.from(this.selectedValues);
    if (this.input) this.input.value = values.join(this.opts.valueSeparator);
  }

  _render() {
    const values = Array.from(this.selectedValues);
    const labels = values
      .map((v) => this.options.find((o) => this.opts.getOptionValue(o) === v))
      .filter(Boolean)
      .map((o) => this.opts.getOptionLabel(/** @type {HTMLElement} */ (o)));

    const label = this.opts.renderButtonLabel(values, labels);
    if (this.btn) this.btn.textContent = label || this.initialButtonText;

    const active = this.options[this.activeIndex];
    if (this.listbox) {
      this.listbox.setAttribute(
        "aria-activedescendant",
        active ? active.id : ""
      );
    }
  }

  _moveActive(nextIndex) {
    if (!this.options.length) return;
    const len = this.options.length;
    const clamped = ((nextIndex % len) + len) % len;
    this._setActive(clamped);
    const el = this.options[clamped];
    if (el && this.listbox) {
      const lbRect = this.listbox.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      if (elRect.top < lbRect.top) el.scrollIntoView({ block: "nearest" });
      else if (elRect.bottom > lbRect.bottom)
        el.scrollIntoView({ block: "nearest" });
    }
  }

  _setActive(index) {
    this.activeIndex = index;
    this._render();
  }
}
