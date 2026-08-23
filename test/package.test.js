import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

test("declares a DSH web client and a loadable bundle patch", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(pkg.dsh.client.platform, "web");
  assert.deepEqual(pkg.dsh.client.inject, [
    "@deepseek-ai/dsh-client-runtime",
    "@deepseek-ai/dsh-client-ui-model-selection"
  ]);
});

test("client bundle registers a DSH ModuleLoader factory with sessions-only root injection", async () => {
  const source = await readFile(new URL("../client.js", import.meta.url), "utf8");
  let descriptor;
  const context = vm.createContext({
    window: { __ModuleLoader__: { load(value) { descriptor = value; } } },
    console,
    queueMicrotask
  });
  vm.runInContext(source, context);
  assert.equal(descriptor.id, "dsh-model-search");
  const plugin = descriptor.factory(() => { throw new Error("unexpected external require"); });
  assert.deepEqual([...plugin.inject], ["sessions"]);
  assert.equal(typeof plugin.apply, "function");
});
