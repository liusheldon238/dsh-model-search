import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { mapGroupedModelRows } from "../lib/dom.js";

const groups = [
  { id: "p1", name: "Provider", models: [{ id: "same-a", name: "Same" }, { id: "same-b", name: "Same" }] },
  { id: "p2", name: "Other", models: [{ id: "other", name: "Other model" }] }
];

function menu(extra = "") {
  return new JSDOM(`<div role="menu" aria-label="Model and reasoning effort">
    <section role="group"><h3>Provider</h3><button role="menuitemradio">Same</button><button role="menuitemradio">Same</button></section>
    ${extra}
    <section role="group"><h3>Other</h3><button role="menuitemradio">Other model</button></section>
  </div>`).window.document.querySelector("[role=menu]");
}

test("maps provider and model IDs by official structural order, including duplicate labels", () => {
  const result = mapGroupedModelRows(menu(), groups);
  assert.ok(result);
  assert.deepEqual(result.entries.map((entry) => [entry.group.id, entry.model.id, entry.row.textContent]), [
    ["p1", "same-a", "Same"],
    ["p1", "same-b", "Same"],
    ["p2", "other", "Other model"]
  ]);
});

test("ignores provider failure sections without selectable model rows", () => {
  const result = mapGroupedModelRows(menu('<section role="group"><p role="alert">Provider failed</p></section>'), groups);
  assert.equal(result.entries.length, 3);
});

test("strictly no-ops on group or row count/order mismatches", () => {
  const wrongRows = menu();
  wrongRows.querySelector("button").remove();
  assert.equal(mapGroupedModelRows(wrongRows, groups), null);
  assert.equal(mapGroupedModelRows(menu(), groups.slice(0, 1)), null);
});
