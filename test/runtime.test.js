import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { startModelSearch } from "../lib/runtime.js";

function store(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    getSnapshot: () => value,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    set(next) { value = next; for (const listener of listeners) listener(); },
    listenerCount: () => listeners.size
  };
}

const snapshot = {
  groups: [{ id: "provider", name: "Provider", models: [{ id: "raw/model-id", name: "Visible model" }] }],
  failures: []
};

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test("observes new composer menus and decorates them from the current public directory", async () => {
  const dom = new JSDOM("<main></main>", { pretendToBeVisual: true });
  const sessions = store({ current: "session-1" });
  const directory = store({
    groups: [{
      id: "provider",
      name: "Provider",
      models: [
        { id: "raw/model-id", name: "Visible model" },
        { id: "raw/other-id", name: "Other model" }
      ]
    }],
    failures: []
  });
  const runtime = startModelSearch({
    document: dom.window.document,
    MutationObserver: dom.window.MutationObserver,
    sessions: { list: sessions },
    modelDirectories: { directoryFor: () => ({ store: directory }) }
  });
  dom.window.document.querySelector("main").innerHTML = '<div role="menu" aria-label="Model and reasoning effort"><section role="group"><button role="menuitemradio">Visible model</button><button role="menuitemradio">Other model</button></section></div>';
  await settle();
  const input = dom.window.document.querySelector('[data-dsh-model-search="composer"] input');
  assert.ok(input);
  input.value = "raw/model-id";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.deepEqual([...dom.window.document.querySelectorAll('button[role="menuitemradio"]')].map((row) => row.hidden), [false, true]);
  runtime.stop();
  assert.equal(dom.window.document.querySelector('[data-dsh-model-search="composer"]'), null);
  assert.equal(sessions.listenerCount(), 0);
  assert.equal(directory.listenerCount(), 0);
});

test("uses the document language and decorates an already-open /model popup", async () => {
  const dom = new JSDOM(`<html lang="zh-CN"><body><div aria-label="为 /model 选择选项">
    <input aria-label="筛选选项"><div role="listbox" aria-label="/model 的选项"><div role="option">Visible model<span>Provider</span></div></div>
  </div></body></html>`, { pretendToBeVisual: true });
  const sessions = store({ current: "session-1" });
  const directory = store(snapshot);
  const runtime = startModelSearch({
    document: dom.window.document,
    MutationObserver: dom.window.MutationObserver,
    sessions: { list: sessions },
    modelDirectories: { directoryFor: () => ({ store: directory }) }
  });
  await settle();
  const input = dom.window.document.querySelector('[data-dsh-model-search="model-command"]');
  assert.ok(input);
  assert.match(input.placeholder, /搜索模型/);
  runtime.stop();
});

test("gracefully no-ops without modelDirectories or DOM observer support", () => {
  const dom = new JSDOM("<main></main>");
  const sessions = store({ current: "session-1" });
  const warnings = [];
  const runtime = startModelSearch({
    document: dom.window.document,
    sessions: { list: sessions },
    onWarning: (warning) => warnings.push(String(warning))
  });
  assert.equal(warnings.length, 1);
  assert.doesNotThrow(runtime.stop);
});
