import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { createRoot } from "react-dom/client";
import { FlagControl, type LabelViewStatus } from "./FlagControl";
import type { Label, LabeledShort, LabelRequest, LabelResponse } from "../shared/labels";

const SHORTS_PATH = /^\/shorts\/([A-Za-z0-9_-]+)\/?$/;

const flagHost = document.createElement("div");
flagHost.style.position = "fixed";
flagHost.style.right = "20px";
flagHost.style.bottom = "20px";
flagHost.style.zIndex = "2147483647";
flagHost.style.display = "none";

const shadow = flagHost.attachShadow({ mode: "closed" });
const mount = document.createElement("div");
shadow.append(mount);
document.documentElement.append(flagHost);

// Emotion must insert its styles into the same shadow root as the React UI.
const emotionCache = createCache({ key: "shorts-flagger", container: shadow });
const root = createRoot(mount);

function getCurrentShortsVideoId(): string | null {
  const match = SHORTS_PATH.exec(window.location.pathname);
  if (!match) {
    return null;
  }

  return match[1];
}

async function sendLabelRequest(request: LabelRequest): Promise<LabeledShort | null> {
  const response = (await chrome.runtime.sendMessage(request)) as LabelResponse | undefined;
  if (response === undefined) {
    throw new Error("No response from label storage");
  }
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response.record;
}

let currentVideoId: string | null = null;
let currentLabel: Label = "unflag";
let viewStatus: LabelViewStatus = "loading";
let operation = 0;
let visit = 0;

function renderFlagControl(): void {
  if (currentVideoId === null) {
    root.render(null);
    return;
  }

  root.render(
    <CacheProvider value={emotionCache}>
      <FlagControl
        key={`${currentVideoId}:${visit}`}
        videoId={currentVideoId}
        label={currentLabel}
        status={viewStatus}
        onToggle={requestToggle}
        onRetry={retryLoadLabel}
      />
    </CacheProvider>,
  );
}

async function requestToggle(videoId: string): Promise<void> {
  if (getCurrentShortsVideoId() !== videoId) {
    checkCurrentShorts();
    return;
  }
  if (viewStatus !== "ready") {
    return;
  }

  const currentOperation = ++operation;
  const currentVisit = visit;
  viewStatus = "saving";
  renderFlagControl();

  try {
    const record = await sendLabelRequest({
      type: "labels:toggle",
      videoId,
      labeledAt: Date.now(),
    });
    if (record === null) {
      throw new Error("Label storage returned no record");
    }
    if (currentVisit !== visit || currentOperation !== operation) {
      return;
    }

    currentLabel = record.label;
    viewStatus = "ready";
    renderFlagControl();
  } catch (error) {
    if (currentVisit !== visit || currentOperation !== operation) {
      return;
    }

    viewStatus = "error";
    renderFlagControl();
    console.error("[Shorts Flagger] Could not save label:", error);
  }
}

function retryLoadLabel(videoId: string): void {
  if (getCurrentShortsVideoId() !== videoId) {
    checkCurrentShorts();
    return;
  }

  const currentOperation = ++operation;
  viewStatus = "loading";
  renderFlagControl();
  void observeCurrentShort(videoId, visit, currentOperation);
}

async function observeCurrentShort(
  videoId: string,
  currentVisit: number,
  currentOperation: number,
): Promise<void> {
  try {
    const record = await sendLabelRequest({
      type: "labels:observe",
      videoId,
      observedAt: Date.now(),
    });
    if (record === null) {
      throw new Error("Short observation returned no record");
    }
    if (currentVisit !== visit || currentOperation !== operation) {
      return;
    }

    currentLabel = record.label;
    viewStatus = "ready";
    renderFlagControl();
  } catch (error) {
    if (currentVisit !== visit || currentOperation !== operation) {
      return;
    }

    viewStatus = "error";
    renderFlagControl();
    console.error("[Shorts Flagger] Could not record Short:", error);
  }
}

function checkCurrentShorts(): void {
  const nextVideoId = getCurrentShortsVideoId();
  if (nextVideoId === currentVideoId) {
    return;
  }

  currentVideoId = nextVideoId;
  visit += 1;
  operation += 1;
  if (nextVideoId === null) {
    flagHost.style.display = "none";
    renderFlagControl();
    return;
  }

  currentLabel = "unflag";
  viewStatus = "loading";
  renderFlagControl();
  flagHost.style.display = "block";
  console.info("[Shorts Flagger] Current Shorts videoId:", nextVideoId);
  void observeCurrentShort(nextVideoId, visit, operation);
}

checkCurrentShorts();
window.addEventListener("popstate", checkCurrentShorts);
window.addEventListener("yt-navigate-finish", checkCurrentShorts);

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() !== "z" || event.repeat || event.isComposing || event.defaultPrevented) {
    return;
  }

  const hasModifier = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  const typingInField = event.composedPath().some((target) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    return target.isContentEditable || target.matches("input, textarea, select");
  });
  if (hasModifier || typingInField) {
    return;
  }
  if (currentVideoId === null || viewStatus !== "ready") {
    return;
  }

  event.preventDefault();
  void requestToggle(currentVideoId);
}, true);

// YouTube's internal navigation events are not a stable API. This also catches URL
// changes from Shorts swipes or navigation paths that do not emit those events.
window.setInterval(checkCurrentShorts, 500);
