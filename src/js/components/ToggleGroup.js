/**
 * @typedef {{element:HTMLElement,group:string,className:string}} ToggleRule
 */

export class ToggleGroup {
  /**
   * @param {ToggleRule[]} rules
   */
  constructor(rules) {
    this.rules = rules;
    this.groups = this.mapGroups(rules);
  }

  mapGroups(rules) {
    const map = {};
    rules.forEach((r) => {
      if (!map[r.group]) map[r.group] = [];
      map[r.group].push(r);
    });
    return map;
  }

  init() {
    this.rules.forEach((rule) => {
      rule.element.addEventListener("click", () => this.toggle(rule));
    });
  }

  toggle(rule) {
    const group = this.groups[rule.group];
    const isActive = rule.element.classList.contains(rule.className);

    group.forEach((r) => r.element.classList.remove(r.className));

    if (!isActive) {
      rule.element.classList.add(rule.className);
    }
  }
}

const parseConfig = (str) =>
  Object.fromEntries(str.split(";").map((p) => p.split(":")));

export const createRules = () =>
  [...document.querySelectorAll("[data-toggle]")].map((el) => {
    const cfg = parseConfig(el.dataset.toggle);
    return {
      element: el,
      group: cfg.group,
      className: cfg.class ? cfg.class : "_is-active",
    };
  });
