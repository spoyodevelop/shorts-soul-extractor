import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { getLabel, observeShort, toggleLabel } from "../src/background/labels.ts";
import { nextLabel } from "../src/shared/labels.ts";

test("toggle switches between the two label states", () => {
  assert.equal(nextLabel("flag"), "unflag");
  assert.equal(nextLabel("unflag"), "flag");
});

test("first observation defaults to Unflag and revisits preserve the saved label", async () => {
  const initial = await observeShort("observed-video", 50);
  assert.deepEqual(initial, {
    videoId: "observed-video",
    label: "unflag",
    observedAt: 50,
    labeledAt: 50,
  });
  assert.deepEqual(await observeShort("observed-video", 60), initial);

  const saved = await toggleLabel("observed-video", 70);
  assert.deepEqual(saved, {
    videoId: "observed-video",
    label: "flag",
    observedAt: 50,
    labeledAt: 70,
  });
  assert.deepEqual(await observeShort("observed-video", 80), saved);
  assert.deepEqual(await getLabel("observed-video"), saved);
});

test("stores the latest toggle per video without changing observation order", async () => {
  assert.equal(await getLabel("video-one"), null);
  await observeShort("video-one", 90);
  await observeShort("video-two", 140);

  const flagged = await toggleLabel("video-one", 100);
  assert.deepEqual(flagged, {
    videoId: "video-one",
    label: "flag",
    observedAt: 90,
    labeledAt: 100,
  });

  const other = await toggleLabel("video-two", 150);

  const unflagged = await toggleLabel("video-one", 200);
  assert.deepEqual(await getLabel("video-one"), unflagged);
  assert.equal(unflagged.label, "unflag");
  assert.equal(unflagged.observedAt, 90);
  assert.deepEqual(await getLabel("video-two"), other);

  const flaggedAgain = await toggleLabel("video-one", 250);
  assert.equal(flaggedAgain.label, "flag");
  assert.equal(flaggedAgain.observedAt, 90);
  assert.deepEqual(await getLabel("video-one"), flaggedAgain);
});

test("simultaneous toggles use the latest committed state", async () => {
  await observeShort("parallel-video", 400);
  await Promise.all([
    toggleLabel("parallel-video", 410),
    toggleLabel("parallel-video", 420),
  ]);
  const record = await getLabel("parallel-video");
  assert.equal(record.label, "unflag");
  assert.equal(record.observedAt, 400);
});

test("older saved labels gain an observation timestamp without losing Flag", async () => {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open("shorts-flagger", 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("labeled-shorts", "readwrite");
    transaction.objectStore("labeled-shorts").put({
      videoId: "older-video",
      label: "flag",
      labeledAt: 500,
    });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();

  const record = await observeShort("older-video", 600);
  assert.deepEqual(record, {
    videoId: "older-video",
    label: "flag",
    observedAt: 500,
    labeledAt: 500,
  });
  assert.deepEqual(await getLabel("older-video"), record);
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

  assert.equal(listener({ type: "labels:toggle", videoId: "", labeledAt: 1 }), false);

  const observed = await new Promise((resolve) => {
    assert.equal(listener({ type: "labels:observe", videoId: "message-video", observedAt: 290 }, {}, resolve), true);
  });
  assert.equal(observed.ok, true);
  assert.equal(observed.record.label, "unflag");
  assert.equal(observed.record.observedAt, 290);

  const toggled = await new Promise((resolve) => {
    assert.equal(listener({ type: "labels:toggle", videoId: "message-video", labeledAt: 300 }, {}, resolve), true);
  });
  assert.equal(toggled.ok, true);
  assert.deepEqual({ ...toggled.record }, {
    videoId: "message-video",
    label: "flag",
    observedAt: 290,
    labeledAt: 300,
  });

  const loaded = await new Promise((resolve) => {
    assert.equal(listener({ type: "labels:get", videoId: "message-video" }, {}, resolve), true);
  });
  assert.equal(loaded.ok, true);
  assert.deepEqual({ ...loaded.record }, { ...toggled.record });
});
