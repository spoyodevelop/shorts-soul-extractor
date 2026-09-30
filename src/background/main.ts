import { getLabel, observeShort, toggleLabel } from "./labels";
import type { LabelRequest, LabelResponse, LabeledShort } from "../shared/labels";

function isLabelRequest(value: unknown): value is LabelRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as Record<string, unknown>;
  const validVideoId =
    typeof request.videoId === "string" && /^[A-Za-z0-9_-]+$/.test(request.videoId);
  if (request.type === "labels:get") {
    return validVideoId;
  }
  if (request.type === "labels:observe") {
    const validTimestamp =
      typeof request.observedAt === "number" &&
      Number.isSafeInteger(request.observedAt) &&
      request.observedAt > 0;
    return validVideoId && validTimestamp;
  }
  if (request.type === "labels:toggle") {
    const validTimestamp =
      typeof request.labeledAt === "number" &&
      Number.isSafeInteger(request.labeledAt) &&
      request.labeledAt > 0;
    return validVideoId && validTimestamp;
  }
  return false;
}

async function handleRequest(request: LabelRequest): Promise<LabeledShort | null> {
  if (request.type === "labels:get") {
    return getLabel(request.videoId);
  }
  if (request.type === "labels:observe") {
    return observeShort(request.videoId, request.observedAt);
  }
  return toggleLabel(request.videoId, request.labeledAt);
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isLabelRequest(message)) {
    return false;
  }

  void handleRequest(message)
    .then((record) => {
      const response: LabelResponse = { ok: true, record };
      sendResponse(response);
    })
    .catch((error: unknown) => {
      const response: LabelResponse = {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown label storage error",
      };
      sendResponse(response);
    });

  return true;
});
