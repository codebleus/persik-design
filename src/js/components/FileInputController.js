/**
 * Small OOP component for <label data-file-input> groups.
 *
 * Markup contract:
 * <label data-file-input>
 *   <span data-file-input-field data-file-size="до 2 мб" data-placeholder="Attach a project" class="field__input"></span>
 *   <input type="file" class="field__input">
 *   <svg class="field__icon" ... />
 * </label>
 *
 * Responsibilities split (SOLID):
 * - FileSizeParser: parses human strings ("2 MB", "до 2 мб", "1.5kb") -> bytes
 * - FileValidator: validates File against a MaxFilePolicy
 * - FileFieldView: reads/writes DOM state (placeholder, aria, dataset)
 * - FileInputController: wires <input type="file"> with view + validator
 *
 * Public API:
 * - new FileInputController(rootLabel, { parser?, validator? })
 * - controller.destroy()
 * - FileInput.bootstrap(root = document): auto-instantiate on [data-file-input]
 *
 * Custom events dispatched on the <label data-file-input>:
 * - "fileinput:valid"   detail: { file }
 * - "fileinput:invalid" detail: { file, reason: "size" }
 * - "fileinput:clear"
 */

class FileSizeParser {
  /**
   * @param {Object} [opts]
   * @param {number} [opts.defaultBytes=Infinity]
   */
  constructor(opts = {}) {
    this.defaultBytes = Number.isFinite(opts.defaultBytes)
      ? opts.defaultBytes
      : Infinity;
  }

  /**
   * Parse a human-friendly size string into bytes.
   * Accepts English/Russian units, case-insensitive, commas or dots.
   * Examples: "2 MB", "до 2 мб", "1,5kb", "1024", "500 B"
   * @param {string|undefined|null} s
   * @returns {number} bytes
   */
  parse(s) {
    if (!s || typeof s !== "string") return this.defaultBytes;

    let v = s
      .trim()
      .toLowerCase()
      .replace(/до|max|maximum|≈|~|about|примерно/g, "") // hints
      .replace(/\s+/g, " ")
      .replace(",", ".")
      .replace(/мб/g, "mb") // cyrillic to latin-ish
      .replace(/кб/g, "kb")
      .replace(/гб/g, "gb");

    const m = v.match(/([0-9]*\.?[0-9]+)\s*(b|kb|mb|gb)?/i);
    if (!m) return this.defaultBytes;

    const num = parseFloat(m[1]);
    const unit = (m[2] || "b").toLowerCase();

    const mul =
      unit === "gb"
        ? 1024 ** 3
        : unit === "mb"
        ? 1024 ** 2
        : unit === "kb"
        ? 1024
        : 1;

    return Math.max(0, Math.round(num * mul));
  }
}

class FileValidator {
  /**
   * @param {(file: File) => boolean} predicate
   */
  constructor(predicate) {
    this.predicate = predicate;
  }
  /**
   * @param {File} file
   * @returns {{ ok: true } | { ok: false, reason: string }}
   */
  validate(file) {
    try {
      return this.predicate(file)
        ? { ok: true }
        : { ok: false, reason: "size" };
    } catch {
      return { ok: false, reason: "size" };
    }
  }

  /**
   * Factory: maximum file size policy.
   * @param {number} maxBytes
   */
  static maxSize(maxBytes) {
    return new FileValidator((file) => file && file.size <= maxBytes);
  }
}

class FileFieldView {
  /**
   * @param {HTMLElement} labelEl <label data-file-input>
   */
  constructor(labelEl) {
    this.root = labelEl;
    this.field = /** @type {HTMLElement} */ (
      labelEl.querySelector("[data-file-input-field]")
    );
    this.input = /** @type {HTMLInputElement} */ (
      labelEl.querySelector('input[type="file"]')
    );
    if (!this.root || !this.field || !this.input) {
      throw new Error("Invalid data-file-input structure.");
    }
  }

  /** Current placeholder text from data-placeholder */
  get placeholder() {
    return this.field.getAttribute("data-placeholder") || "";
  }

  /** Set placeholder attribute */
  set placeholder(value) {
    this.field.setAttribute("data-placeholder", value);
  }

  /** Read max size constraint from data-file-size */
  getMaxSizeString() {
    return this.field.getAttribute("data-file-size") || "";
  }

  markValid() {
    this.root.removeAttribute("aria-invalid");
    this.root.dataset.error = "";
  }

  /**
   * @param {string} reason
   * @param {string} message
   */
  markInvalid(reason, message) {
    this.root.setAttribute("aria-invalid", "true");
    this.root.dataset.error = message || reason;
  }

  clearVisual() {
    this.placeholder = this.field.getAttribute("data-placeholder") || "";
  }

  dispatch(name, detail) {
    this.root.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }
}

export class FileInputController {
  /**
   * @param {HTMLElement} labelEl <label data-file-input>
   * @param {Object} [deps]
   * @param {FileSizeParser} [deps.parser]
   * @param {FileValidator} [deps.validator] will be created from data-file-size if not provided
   */
  constructor(labelEl, deps = {}) {
    this.view = new FileFieldView(labelEl);
    this.parser = deps.parser || new FileSizeParser();

    const maxBytes = this.parser.parse(this.view.getMaxSizeString());
    this.validator = deps.validator || FileValidator.maxSize(maxBytes);

    this.onChange = this.onChange.bind(this);
    this.onInputClear = this.onInputClear.bind(this);

    this.view.input.addEventListener("change", this.onChange);
    this.view.input.addEventListener("click", this.onInputClear, true);
  }

  /** Clear selection placeholder if user re-opens picker and cancels */
  onInputClear() {
    if (!this.view.input.files || this.view.input.files.length === 0) {
      this.view.clearVisual();
      this.view.dispatch("fileinput:clear");
    }
  }

  onChange() {
    const file = this.view.input.files && this.view.input.files[0];
    if (!file) {
      this.view.clearVisual();
      this.view.dispatch("fileinput:clear");
      return;
    }

    const res = this.validator.validate(file);
    if (res.ok) {
      this.view.placeholder = file.name;
      this.view.markValid();
      this.view.dispatch("fileinput:valid", { file });
    } else {
      this.view.markInvalid(res.reason, this.buildSizeMessage());
      this.view.dispatch("fileinput:invalid", { file, reason: res.reason });
    }
  }

  buildSizeMessage() {
    const original = this.view.getMaxSizeString();
    return original
      ? `File exceeds limit (${original}).`
      : "File is too large.";
  }

  destroy() {
    this.view.input.removeEventListener("change", this.onChange);
    this.view.input.removeEventListener("click", this.onInputClear, true);
  }

  /**
   * Convenience bootstrap: instantiate for all [data-file-input] under root.
   * @param {ParentNode} [root=document]
   * @returns {FileInputController[]}
   */
  static bootstrap(root = document) {
    return Array.from(root.querySelectorAll("[data-file-input]")).map(
      (el) => new FileInputController(el)
    );
  }
}
