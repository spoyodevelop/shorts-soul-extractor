import { getLabel, saveLabel } from "./labels";
import type { LabelRequest, LabelResponse, LabeledShort } from "../shared/labels";

function isLabeledShort(value: unknown): value is LabeledShort {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const validVideoId =
    typeof record.videoId === "string" && /^[A-Za-z0-9_-]+$/.test(record.videoId);
  const validLabel = record.label === "flag" || record.label === "unflag";
  const validTimestamp =
    typeof record.labeledAt === "number" &&
    Number.isSafeInteger(record.labeledAt) &&
    record.labeledAt > 0;
  return validVideoId && validLabel && validTimestamp;
}

function isLabelRequest(value: unknown): value is LabelRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as Record<string, unknown>;
  if (request.type === "labels:get") {
    const validVideoId =
      typeof request.videoId === "string" && /^[A-Za-z0-9_-]+$/.test(request.videoId);
    return validVideoId;
  }
  if (request.type === "labels:save") {
    return isLabeledShort(request.record);
  }
  return false;
}

async function handleRequest(request: LabelRequest): Promise<LabeledShort | null> {
  if (request.type === "labels:get") {
    return getLabel(request.videoId);
  }
  return saveLabel(request.record);
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
