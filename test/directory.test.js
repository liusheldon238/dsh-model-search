import test from "node:test";
import assert from "node:assert/strict";
import { bindCurrentDirectory } from "../lib/directory.js";

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

test("binds the public directory for the current session and rebinds when it changes", async () => {
  const sessionsStore = store({ current: { sessionId: "one" } });
  const first = store({ groups: [{ id: "a", models: [] }], failures: [] });
  const second = store({ groups: [{ id: "b", models: [] }], failures: [] });
  const loaded = [];
  const directories = new Map([
    ["one", { store: first, load: async () => loaded.push("one") }],
    ["two", { store: second, load: async () => loaded.push("two") }]
  ]);
  const seen = [];
  const stop = bindCurrentDirectory({
    sessions: { list: sessionsStore },
    modelDirectories: { directoryFor: (id) => directories.get(id) },
    onSnapshot: (snapshot) => seen.push(snapshot.groups[0]?.id)
  });
  await Promise.resolve();
  assert.equal(first.listenerCount(), 1);
  assert.deepEqual(loaded, ["one"]);
  assert.deepEqual(seen, ["a"]);

  sessionsStore.set({ current: { sessionId: "two" } });
  await Promise.resolve();
  assert.equal(first.listenerCount(), 0);
  assert.equal(second.listenerCount(), 1);
  assert.deepEqual(loaded, ["one", "two"]);
  assert.deepEqual(seen, ["a", "b"]);

  stop();
  assert.equal(sessionsStore.listenerCount(), 0);
  assert.equal(second.listenerCount(), 0);
});

test("supports a current session ID and safely reports no session", () => {
  const sessionsStore = store({ current: "direct-id" });
  const directory = store({ groups: [], failures: [] });
  const seen = [];
  const stop = bindCurrentDirectory({
    sessions: { list: sessionsStore },
    modelDirectories: { directoryFor: (id) => (assert.equal(id, "direct-id"), { store: directory }) },
    onSnapshot: (snapshot) => seen.push(snapshot)
  });
  assert.equal(seen.length, 1);
  sessionsStore.set({ current: undefined });
  assert.equal(seen.at(-1), null);
  stop();
});

test("gracefully no-ops when the optional model directory service is absent", () => {
  const sessionsStore = store({ current: "one" });
  const seen = [];
  const stop = bindCurrentDirectory({ sessions: { list: sessionsStore }, onSnapshot: (value) => seen.push(value) });
  assert.deepEqual(seen, [null]);
  assert.doesNotThrow(stop);
});
