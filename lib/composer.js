import { modelMatches } from "./filter.js";
import { mapGroupedModelRows } from "./dom.js";

const controllers = new WeakMap();
const warned = new WeakSet();

export function isComposerModelMenu(root) {
  if (root?.getAttribute?.("role") !== "menu") return false;
  const label = root.getAttribute("aria-label") ?? "";
  return /model.*reasoning|模型.*推理/i.test(label);
}

function warnIncompatible(root, onWarning) {
  if (warned.has(root)) return;
  warned.add(root);
  onWarning("dsh-model-search: official composer model DOM is incompatible; enhancement disabled");
}

export function decorateComposerMenu(root, groups, { locale = "en", onWarning = console.warn } = {}) {
  if (controllers.has(root)) return controllers.get(root);
  if (!isComposerModelMenu(root)) return null;
  const mapping = mapGroupedModelRows(root, groups);
  if (!mapping) {
    warnIncompatible(root, onWarning);
    return null;
  }

  const document = root.ownerDocument;
  const wrapper = document.createElement("div");
  wrapper.dataset.dshModelSearch = "composer";
  wrapper.style.cssText = "padding:8px;position:sticky;top:0;z-index:1;background:inherit";
  const input = document.createElement("input");
  input.type = "search";
  input.autocomplete = "off";
  input.placeholder = locale.startsWith("zh") ? "搜索模型名称、提供商或模型 ID" : "Search name, provider, or model ID";
  input.setAttribute("aria-label", input.placeholder);
  input.style.cssText = "box-sizing:border-box;width:100%;border:1px solid currentColor;border-radius:8px;padding:7px 9px;background:transparent;color:inherit;font:inherit";
  wrapper.append(input);

  const empty = document.createElement("div");
  empty.dataset.dshModelSearch = "empty";
  empty.textContent = locale.startsWith("zh") ? "没有匹配的模型" : "No matching models";
  empty.style.cssText = "padding:12px;opacity:.7;text-align:center";
  empty.hidden = true;
  root.insertBefore(wrapper, mapping.sections[0]);
  root.append(empty);

  let visible = mapping.entries;
  let activeIndex = -1;
  const applyFilter = () => {
    visible = [];
    const query = input.value;
    for (const entry of mapping.entries) {
      const match = modelMatches(entry.group, entry.model, query);
      entry.row.hidden = !match;
      if (match) visible.push(entry);
    }
    for (const section of mapping.sections) {
      section.hidden = !mapping.entries.some((entry) => entry.section === section && !entry.row.hidden);
    }
    activeIndex = -1;
    empty.hidden = visible.length !== 0;
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
      for (const entry of mapping.entries) entry.row.hidden = false;
      for (const section of mapping.sections) section.hidden = false;
      wrapper.remove();
      empty.remove();
      controllers.delete(root);
    }
  };
  controllers.set(root, control);
  input.focus();
  return control;
}
