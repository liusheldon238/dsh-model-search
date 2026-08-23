import test from "node:test";
import assert from "node:assert/strict";
import { filterGroups, modelMatches } from "../lib/filter.js";

const groups = [
  {
    id: "deepseek",
    name: "DeepSeek 官方",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3" },
      { id: "deepseek-reasoner", name: "DeepSeek R1" }
    ]
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    models: [
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" }
    ]
  }
];

test("matches continuous substrings case-insensitively across provider and model fields", () => {
  assert.equal(modelMatches(groups[1], groups[1].models[0], "SONNET-4"), true);
  assert.equal(modelMatches(groups[1], groups[1].models[0], "openROUTER"), true);
  assert.equal(modelMatches(groups[1], groups[1].models[0], "anthropic/claude"), true);
  assert.equal(modelMatches(groups[0], groups[0].models[0], "seek v"), true);
  assert.equal(modelMatches(groups[0], groups[0].models[0], "seekv"), false);
});

test("empty queries preserve every model and original ordering", () => {
  const result = filterGroups(groups, "   ");
  assert.deepEqual(result.map((group) => group.id), ["deepseek", "openrouter"]);
  assert.deepEqual(result[0].models.map((model) => model.id), ["deepseek-chat", "deepseek-reasoner"]);
});

test("supports Unicode names and removes empty provider groups", () => {
  const result = filterGroups(groups, "官方");
  assert.deepEqual(result.map((group) => group.id), ["deepseek"]);
  assert.deepEqual(result[0].models.map((model) => model.id), ["deepseek-chat", "deepseek-reasoner"]);
});

test("returns an empty list for empty groups or no matches", () => {
  assert.deepEqual(filterGroups([], "anything"), []);
  assert.deepEqual(filterGroups(groups, "not-present"), []);
});
