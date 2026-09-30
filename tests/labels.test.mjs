import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { getLabel, saveLabel } from "../src/background/labels.ts";
import { nextLabel } from "../src/shared/labels.ts";

test("toggle advances from unlabeled through Flag and Unflag", () => {
  assert.equal(nextLabel(null), "flag");
  assert.equal(nextLabel("flag"), "unflag");
  assert.equal(nextLabel("unflag"), "flag");
});

test("stores only the latest explicit label for each video", async () => {
  assert.equal(await getLabel("video-one"), null);

  const flagged = { videoId: "video-one", label: "flag", labeledAt: 100 };
  await saveLabel(flagged);
  assert.deepEqual(await getLabel("video-one"), flagged);

  const other = { videoId: "video-two", label: "flag", labeledAt: 150 };
  await saveLabel(other);

  const unflagged = { videoId: "video-one", label: "unflag", labeledAt: 200 };
  await saveLabel(unflagged);
  assert.deepEqual(await getLabel("video-one"), unflagged);
  assert.deepEqual(await getLabel("video-two"), other);

  const flaggedAgain = { videoId: "video-one", label: "flag", labeledAt: 250 };
  await saveLabel(flaggedAgain);
  assert.deepEqual(await getLabel("video-one"), flaggedAgain);
});

test("background messages confirm committed labels and reject invalid input", async () => {
  const bundle = await build({
    entryPoints: ["src/background/main.ts"],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
  });
  let listener;
  const chrome = {
    runtime: {
      onMessage: {
        addListener(callback) {
          listener = callback;
        },
      },
    },
  };
  runInNewContext(bundle.outputFiles[0].text, { chrome, indexedDB });

  assert.equal(listener({ type: "labels:save", record: { videoId: "", label: "flag", labeledAt: 1 } }), false);

  const record = { videoId: "message-video", label: "unflag", labeledAt: 300 };
  const saved = await new Promise((resolve) => {
    assert.equal(listener({ type: "labels:save", record }, {}, resolve), true);
  });
  assert.equal(saved.ok, true);
  assert.deepEqual({ ...saved.record }, record);

  const loaded = await new Promise((resolve) => {
    assert.equal(listener({ type: "labels:get", videoId: record.videoId }, {}, resolve), true);
  });
  assert.equal(loaded.ok, true);
  assert.deepEqual({ ...loaded.record }, record);
});
