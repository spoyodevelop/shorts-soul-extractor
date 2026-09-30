import assert from "node:assert/strict";
import test from "node:test";
import { isToggleKey } from "../src/content/shortcuts.ts";

const key = {
  code: "KeyZ",
  key: "z",
  repeat: false,
  isComposing: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
};

test("the physical Z key works in English and Korean layouts", () => {
  assert.equal(isToggleKey(key), true);
  assert.equal(isToggleKey({ ...key, key: "Z", shiftKey: true }), true);
  assert.equal(isToggleKey({ ...key, key: "ㅋ" }), true);
  assert.equal(isToggleKey({ ...key, key: "Process" }), true);
  assert.equal(isToggleKey({ ...key, code: "KeyX", key: "z" }), false);
});

test("typing composition, held keys, and modified shortcuts do not toggle", () => {
  for (const property of ["repeat", "isComposing", "altKey", "ctrlKey", "metaKey"]) {
    assert.equal(isToggleKey({ ...key, [property]: true }), false, property);
  }
});
