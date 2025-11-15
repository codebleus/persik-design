/**
 * SetState (data attributes driven) – OOP, SOLID, delegated (fixed).
 */

class SetStateParser {
  parse(raw) {
    if (!raw || typeof raw !== "string") return null;
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const selector = parts[0];
    if (!selector) return null;
    const className = parts[1] && parts[1].length ? parts[1] : "_is-active";
    let outsideReset = false;
    if (parts[2] != null) {
      const p3 = parts[2].toLowerCase();
      outsideReset = p3 === "true" || p3 === "1" || p3 === "yes";
    }
    return { selector, className, outsideReset };
  }
}

class SetStateAction {
  constructor(triggerEl, directive) {
    this.triggerEl = triggerEl;
    this.selector = directive.selector;
    this.className = directive.className;
    this.outsideReset = directive.outsideReset;
    this.target = null;
  }
  resolveTarget() {
    if (this.target && document.contains(this.target)) return this.target;
    this.target = document.querySelector(this.selector);
    return this.target;
  }
  apply() {
    const target = this.resolveTarget();
    if (!target) return false;
    target.classList.add(this.className);
    return true;
  }
  reset() {
    const target = this.resolveTarget();
    if (!target) return false;
    target.classList.remove(this.className);
    return true;
  }
  isApplied() {
    const target = this.resolveTarget();
    return !!target && target.classList.contains(this.className);
  }
}

export class SetStateController {
  constructor(opts = {}) {
    this.attr = opts.attribute ?? "data-set-state";
    this.resetAttr = opts.resetAttr ?? "data-reset-state";
    this.parser = opts.parser ?? new SetStateParser();

    // trigger -> action (WeakMap, no iteration)
    this._actionCache = new WeakMap();

    // target -> Set<action> (WeakMap, no iteration; lookup by target only)
    this._byTarget = new WeakMap();

    // targets armed for outside close
    this._outsideActive = new Set();

    // suppress immediate outside close after open
    this._suppressOutsideOnce = new WeakSet();

    this._onDocClick = this._onDocClick.bind(this);
  }

  init() {
    document.addEventListener("click", this._onDocClick, true);
  }

  destroy() {
    document.removeEventListener("click", this._onDocClick, true);
    this._actionCache = new WeakMap();
    this._byTarget = new WeakMap();
    this._outsideActive.clear();
    this._suppressOutsideOnce = new WeakSet();
  }

  _onDocClick(e) {
    const targetNode = /** @type {HTMLElement} */ (e.target);

    // 1) Trigger
    const trigger = targetNode.closest?.(`[${this.attr}]`);
    if (trigger) {
      const action = this._getOrCreateAction(trigger);
      if (!action) return;

      const applied = action.apply();

      if (applied && action.outsideReset) {
        const tgt = action.resolveTarget();
        if (tgt) {
          this._outsideActive.add(tgt);
          this._suppressOutsideOnce.add(tgt);
          setTimeout(() => this._suppressOutsideOnce.delete(tgt), 0);
        }
      }
      return;
    }

    // 2) Target self-reset
    const resetEl = targetNode.closest?.(`[${this.resetAttr}]`);
    if (resetEl) {
      this._resetByTarget(resetEl);
      this._outsideActive.delete(resetEl);
      // if resetEl is inside an active target ancestor
      for (const t of Array.from(this._outsideActive)) {
        if (t.contains(resetEl)) {
          this._resetByTarget(t);
          this._outsideActive.delete(t);
        }
      }
      return;
    }

    // 3) Outside reset
    if (this._outsideActive.size) {
      for (const tgt of Array.from(this._outsideActive)) {
        if (this._suppressOutsideOnce.has(tgt)) continue;
        if (!tgt.contains(targetNode)) {
          this._resetByTarget(tgt);
          this._outsideActive.delete(tgt);
        }
      }
    }
  }

  _getOrCreateAction(trigger) {
    let action = this._actionCache.get(trigger);
    if (action) return action;

    const raw = trigger.getAttribute(this.attr) || "";
    const directive = this.parser.parse(raw);
    if (!directive) return null;

    action = new SetStateAction(trigger, directive);
    this._actionCache.set(trigger, action);

    // index by target for O(1) reverse lookup
    const tgt = action.resolveTarget();
    if (tgt) {
      let set = this._byTarget.get(tgt);
      if (!set) {
        set = new Set();
        this._byTarget.set(tgt, set);
      }
      set.add(action);

      // revive outside-active if already applied (e.g., SSR)
      if (action.outsideReset && action.isApplied()) {
        this._outsideActive.add(tgt);
      }
    }

    return action;
  }

  _resetByTarget(tgt) {
    const actions = this._byTarget.get(tgt);
    if (!actions) return;
    for (const action of actions) {
      action.reset();
    }
  }
}
