import { modelMatches } from "./filter.js";

const controllers = new WeakMap();
const warned = new WeakSet();

function nativeSearch(card) {
  return [...(card?.querySelectorAll?.("input") ?? [])].find((input) =>
    /filter options|筛选选项/i.test(input.getAttribute("aria-label") ?? ""));
}

export function isModelCommandPopup(card) {
  if (!nativeSearch(card)) return false;
  const listbox = card.querySelector?.('[role="listbox"]');
  return /\/model\b/i.test(listbox?.getAttribute("aria-label") ?? "");
}

function mapRows(card, directory) {
  const rows = [...card.querySelectorAll('[role="listbox"] [role="option"]')];
  const entries = [];
  for (const group of directory?.groups ?? []) {
    for (const model of group.models ?? []) entries.push({ group, model });
  }
  for (const failure of directory?.failures ?? []) {
    entries.push({
      group: { id: failure.id, name: failure.name },
      model: { id: `failure/${failure.id}`, name: failure.name, description: failure.message }
    });
  }
  if (rows.length !== entries.length) return null;
  return entries.map((entry, index) => ({ ...entry, row: rows[index] }));
}

function warnIncompatible(card, onWarning) {
  if (warned.has(card)) return;
  warned.add(card);
  onWarning("dsh-model-search: official /model DOM is incompatible; enhancement disabled");
}

export function decorateModelCommand(card, directory, { locale = "en", onWarning = console.warn } = {}) {
  if (controllers.has(card)) return controllers.get(card);
  if (!isModelCommandPopup(card)) return null;
  const entries = mapRows(card, directory);
  if (!entries) {
    warnIncompatible(card, onWarning);
    return null;
  }

  const native = nativeSearch(card);
  const document = card.ownerDocument;
  const input = document.createElement("input");
  input.type = "search";
  input.autocomplete = "off";
  input.dataset.dshModelSearch = "model-command";
  input.placeholder = locale.startsWith("zh") ? "搜索模型名称、提供商或模型 ID" : "Search name, provider, or model ID";
  input.setAttribute("aria-label", input.placeholder);
  input.style.cssText = "box-sizing:border-box;width:100%;border:1px solid currentColor;border-radius:8px;padding:7px 9px;background:transparent;color:inherit;font:inherit";
  native.parentNode.insertBefore(input, native);

  // Keep the official controlled filter blank so raw-ID matches are not removed
  // before this decorator can evaluate them. The original controller still owns
  // option selection and dismissal.
  native.value = "";
  native.dispatchEvent(new document.defaultView.Event("input", { bubbles: true }));
  native.hidden = true;

  let visible = entries;
  let activeIndex = -1;
  const applyFilter = () => {
    visible = [];
    for (const entry of entries) {
      const match = modelMatches(entry.group, entry.model, input.value);
      entry.row.hidden = !match;
      if (match) visible.push(entry);
    }
    activeIndex = -1;
  };
  const onInput = () => applyFilter();
  const onKeyDown = (event) => {
    if (event.key === "Escape" && input.value) {
      event.preventDefault();
      event.stopPropagation();
      input.value = "";
      applyFilter();
      return;
    }
    if (!visible.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      activeIndex = activeIndex < 0
        ? (direction > 0 ? 0 : visible.length - 1)
        : (activeIndex + direction + visible.length) % visible.length;
      visible[activeIndex].row.focus();
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      visible[activeIndex].row.click();
    }
  };
  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKeyDown);

  const control = {
    input,
    destroy() {
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKeyDown);
      for (const entry of entries) entry.row.hidden = false;
      native.hidden = false;
      input.remove();
      controllers.delete(card);
    }
  };
  controllers.set(card, control);
  input.focus();
  return control;
}
