import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { decorateComposerMenu, isComposerModelMenu } from "../lib/composer.js";

const groups = [
  {
    id: "deepseek",
    name: "DeepSeek",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3" },
      { id: "deepseek-reasoner", name: "DeepSeek R1" }
    ]
  },
  { id: "openrouter", name: "OpenRouter", models: [{ id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" }] }
];

function fixture(label = "Model and reasoning effort") {
  const dom = new JSDOM(`<div role="menu" aria-label="${label}">
    <section role="group"><h3>DeepSeek</h3><button role="menuitemradio">DeepSeek V3</button><button role="menuitemradio">DeepSeek R1</button></section>
    <section role="group"><h3>OpenRouter</h3><button role="menuitemradio">Claude Sonnet 4</button></section>
  </div>`, { pretendToBeVisual: true });
  return { dom, menu: dom.window.document.querySelector("[role=menu]") };
}

function input(input, value) {
  input.value = value;
  input.dispatchEvent(new input.ownerDocument.defaultView.Event("input", { bubbles: true }));
}

test("recognizes localized semantic model menus", () => {
  assert.equal(isComposerModelMenu(fixture().menu), true);
  assert.equal(isComposerModelMenu(fixture("模型与推理等级").menu), true);
  assert.equal(isComposerModelMenu(fixture("Settings").menu), false);
});

test("injects once, focuses search, filters raw IDs, and hides empty groups", () => {
  const { menu } = fixture();
  const control = decorateComposerMenu(menu, groups, { locale: "en" });
  assert.ok(control);
  assert.equal(menu.querySelectorAll('[data-dsh-model-search="composer"]').length, 1);
  assert.equal(menu.ownerDocument.activeElement, control.input);
  assert.equal(decorateComposerMenu(menu, groups), control);

  input(control.input, "anthropic/claude");
  const sections = menu.querySelectorAll('section[role="group"]');
  assert.equal(sections[0].hidden, true);
  assert.equal(sections[1].hidden, false);
  assert.deepEqual([...menu.querySelectorAll('button[role="menuitemradio"]')].map((row) => row.hidden), [true, true, false]);

  input(control.input, "missing");
  assert.equal(menu.querySelector('[data-dsh-model-search="empty"]').hidden, false);
  assert.equal(menu.querySelector('[data-dsh-model-search="empty"]').textContent, "No matching models");
});

test("restores all official rows on clear and cleanup", () => {
  const { menu } = fixture("模型与推理等级");
  const control = decorateComposerMenu(menu, groups, { locale: "zh" });
  input(control.input, "claude");
  input(control.input, "");
  assert.equal([...menu.querySelectorAll("[hidden]")].length, 1); // hidden empty state only
  control.destroy();
  assert.equal(menu.querySelector('[data-dsh-model-search="composer"]'), null);
  assert.equal([...menu.querySelectorAll('section[role="group"], button[role="menuitemradio"]')].some((node) => node.hidden), false);
});

test("keyboard navigation clicks original rows and Escape clears before bubbling", () => {
  const { menu, dom } = fixture();
  const rows = [...menu.querySelectorAll('button[role="menuitemradio"]')];
  let clicked = 0;
  rows[2].addEventListener("click", () => { clicked += 1; });
  const control = decorateComposerMenu(menu, groups);
  input(control.input, "claude");

  control.input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  control.input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  assert.equal(clicked, 1);

  let escaped = 0;
  menu.addEventListener("keydown", (event) => { if (event.key === "Escape") escaped += 1; });
  control.input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(control.input.value, "");
  assert.equal(escaped, 0);
  control.input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(escaped, 1);
});

test("warns once and safely no-ops when official DOM structure is incompatible", () => {
  const { menu } = fixture();
  menu.querySelector("button").remove();
  const warnings = [];
  assert.equal(decorateComposerMenu(menu, groups, { onWarning: (message) => warnings.push(message) }), null);
  assert.equal(decorateComposerMenu(menu, groups, { onWarning: (message) => warnings.push(message) }), null);
  assert.equal(warnings.length, 1);
});
