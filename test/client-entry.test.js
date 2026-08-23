import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { apply, inject } from "../src/client-entry.js";

test("requires only sessions at root and acquires modelDirectories through optional injection", () => {
  assert.deepEqual(inject, ["sessions"]);
  const dom = new JSDOM("<main></main>");
  const calls = [];
  const cleanup = [];
  const scope = {
    sessions: { list: { getSnapshot: () => ({ current: undefined }), subscribe: () => () => {} } },
    modelDirectories: {},
    effect(factory, label) { calls.push(label); cleanup.push(factory()); }
  };
  const ctx = {
    inject(services, callback) {
      calls.push(services);
      callback(scope);
      return () => {};
    }
  };
  apply(ctx, { document: dom.window.document, MutationObserver: dom.window.MutationObserver });
  assert.deepEqual(calls[0], ["modelDirectories"]);
  assert.equal(calls[1], "dsh-model-search: DOM observer");
  assert.equal(typeof cleanup[0], "function");
  assert.doesNotThrow(cleanup[0]);
});

test("does not throw when optional service injection never activates", () => {
  assert.doesNotThrow(() => apply({ inject() { return () => {}; } }));
});
