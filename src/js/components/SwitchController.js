/**
 * @typedef {{element:HTMLElement,target:HTMLElement,className:string,action:"on"|"off"}} SwitchRule
 */

import { lenis } from "../main.js";

export class SwitchController {
  /**
   * @param {SwitchRule[]} rules
   */
  constructor(rules) {
    this.rules = rules;
  }

  init() {
    this.rules.forEach((rule) => {
      rule.element.addEventListener("click", () => this.toggle(rule));
    });
  }

  toggle(rule) {
    if (!rule.target) return;
    if (rule.action === "on") {
      rule.target.classList.add(rule.className);
      console.log(rule.lock);
      if (rule.lock && rule.lock === "true") {
        lenis.stop();
      }
    } else {
      rule.target.classList.remove(rule.className);
      if (rule.lock && rule.lock === "false") {
        lenis.start();
      }
    }
  }
}

const parseConfig = (str) =>
  Object.fromEntries(
    str.split(";").map((p) => {
      const i = p.indexOf(":");
      return [p.slice(0, i), p.slice(i + 1)];
    })
  );

export const createControllerRules = () =>
  [...document.querySelectorAll("[data-switch]")].map((el) => {
    const cfg = parseConfig(el.dataset.switch);
    return {
      element: el,
      target: document.querySelector(cfg.target),
      className: cfg.class || "_is-active",
      action: cfg.action === "off" ? "off" : "on",
      lock: cfg.lock === "true" ? "true" : "false",
    };
  });
