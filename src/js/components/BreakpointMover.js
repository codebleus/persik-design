/**
 * @typedef {{element:HTMLElement,from:HTMLElement,to:HTMLElement,mq:MediaQueryList}} MoveRule
 */

export class BreakpointMover {
  /**
   * @param {MoveRule[]} rules
   */
  constructor(rules) {
    this.rules = rules;
  }

  init() {
    this.rules.forEach((rule) => {
      const handler = (e) => this.handle(rule, e);
      rule.handler = handler;
      this.handle(rule, rule.mq);
      rule.mq.addEventListener("change", handler);
    });
  }

  handle(rule, e) {
    e.matches ? rule.to.append(rule.element) : rule.from.append(rule.element);
  }
}

const parseConfig = (str) =>
  Object.fromEntries(str.split(";").map((p) => p.split(":")));

export const createRules = () =>
  [...document.querySelectorAll("[data-move]")].map((el) => {
    const cfg = parseConfig(el.dataset.move);
    return {
      element: el,
      from: document.querySelector(cfg.from),
      to: document.querySelector(cfg.to),
      mq: cfg.query
        ? window.matchMedia(cfg.query)
        : window.matchMedia("(max-width: 48em)"),
    };
  });
