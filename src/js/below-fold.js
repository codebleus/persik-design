import { NavMenu } from "./components/navMenu.js";
import { U } from "./functions/utils.js";
import { InputMaskManager } from "./components/InputMaskManager.js";

U.addClass(document.documentElement, "_page-loaded");

/* nav menu instance */
const navRoot = U.qs(".header__nav", document);
if (navRoot) {
  new NavMenu(navRoot, {
    itemSel: ".header__nav-item",
    btnSel: ".nav-item__btn",
    activeCl: "_is-active",
    mq: "(min-width: 48.01em)",
    clearOnLeave: true,
    escToClear: true,
  });
}

/* slider instances */
// new Slider(".stories__slider", {
//   slidesPerView: 6,
//   spaceBetween: 0,
// }).init();

/* select instances */
// if (U.qs("[data-select]")) {
//   U.qsa("[data-select]").forEach((fs) => {
//     const resetBtn = U.qs("[data-reset-btn]", fs.closest("form") || document);
//     new AccessibleSelect(fs, {
//       multiple: true,
//       valueSeparator: ", ",
//       resetButton: resetBtn,
//       getOptionValue: (opt) =>
//         opt.dataset.value
//           ? (opt.textContent || "").trim()
//           : (opt.textContent || "").trim(),
//       getOptionLabel: (opt) => (opt.textContent || "").trim(),
//       renderButtonLabel(values, labels) {},
//     });
//   });
// }

/* file input controller instance */
// FileInputController.bootstrap();

/* input mask manager instance */
new InputMaskManager().init();

/* state controller instance */
// new SetStateController().init();
