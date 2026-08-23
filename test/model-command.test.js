import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { decorateModelCommand, isModelCommandPopup } from "../lib/model-command.js";

const directory = {
  groups: [
    { id: "deepseek", name: "DeepSeek", models: [{ id: "deepseek-chat", name: "DeepSeek V3" }] },
    { id: "openrouter", name: "OpenRouter", models: [{ id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" }] }
  ],
  failures: [{ id: "broken", name: "Broken provider" }]
};

function fixture(search = "native-query") {
  const dom = new JSDOM(`<div aria-label="Select an option for /model">
    <input aria-label="Filter options" value="${search}">
    <div role="listbox" aria-label="Options for /model">
      <div role="option">DeepSeek V3<span>DeepSeek</span></div>
      <div role="option">Claude Sonnet 4<span>OpenRouter</span></div>
      <div role="option">Broken provider<span>Catalog failed</span></div>
    </div>
  </div>`, { pretendToBeVisual: true });
  return { dom, card: dom.window.document.querySelector("div[aria-label]") };
}

function type(input, value) {
  input.value = value;
  input.dispatchEvent(new input.ownerDocument.defaultView.Event("input", { bubbles: true }));
}

test("recognizes model popup using accessible labels", () => {
  assert.equal(isModelCommandPopup(fixture().card), true);
  const { card } = fixture();
  card.querySelector('[role="listbox"]').setAttribute("aria-label", "Options for /help");
  assert.equal(isModelCommandPopup(card), false);
});

test("neutralizes native label-only search and filters by raw model ID", () => {
  const { card } = fixture();
  const native = card.querySelector('input[aria-label="Filter options"]');
  let nativeInputs = 0;
  native.addEventListener("input", () => { nativeInputs += 1; });
  const control = decorateModelCommand(card, directory, { locale: "en" });
  assert.ok(control);
  assert.equal(native.value, "");
  assert.equal(native.hidden, true);
  assert.equal(nativeInputs, 1);
  type(control.input, "anthropic/claude");
  assert.deepEqual([...card.querySelectorAll('[role="option"]')].map((row) => row.hidden), [true, false, true]);
});

test("keeps failure rows visible for provider-name searches and preserves original click handlers", () => {
  const { card, dom } = fixture("");
  const rows = [...card.querySelectorAll('[role="option"]')];
  let selected = 0;
  rows[0].addEventListener("click", () => { selected += 1; });
  const control = decorateModelCommand(card, directory, { locale: "zh" });
  type(control.input, "broken");
  assert.deepEqual(rows.map((row) => row.hidden), [true, true, false]);
  type(control.input, "deepseek-chat");
  control.input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  control.input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  assert.equal(selected, 1);
});

test("clears on first Escape, bubbles the second, and restores on cleanup", () => {
  const { card, dom } = fixture("");
  const native = card.querySelector("input");
  const control = decorateModelCommand(card, directory);
  type(control.input, "claude");
  let escaped = 0;
  card.addEventListener("keydown", (event) => { if (event.key === "Escape") escaped += 1; });
  control.input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(escaped, 0);
  control.input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(escaped, 1);
  control.destroy();
  assert.equal(native.hidden, false);
  assert.equal([...card.querySelectorAll('[role="option"]')].some((row) => row.hidden), false);
});

test("no-ops with a warning when the option count cannot be mapped safely", () => {
  const { card } = fixture("");
  card.querySelector('[role="option"]').remove();
  const warnings = [];
  assert.equal(decorateModelCommand(card, directory, { onWarning: (message) => warnings.push(message) }), null);
  assert.equal(warnings.length, 1);
});
