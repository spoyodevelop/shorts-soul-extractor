import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { createRoot } from "react-dom/client";
import { FlagControl } from "./FlagControl";

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

function requestFlag(videoId: string): boolean {
  if (getCurrentShortsVideoId() !== videoId) {
    checkCurrentShorts();
    return false;
  }

  console.info("[Shorts Flagger] Flag requested (not saved):", {
    videoId,
    url: window.location.href,
    flaggedAt: new Date().toISOString(),
  });
  return true;
}

let currentVideoId: string | null = null;
let visit = 0;

function checkCurrentShorts(): void {
  const nextVideoId = getCurrentShortsVideoId();
  if (nextVideoId === currentVideoId) {
    return;
  }

  currentVideoId = nextVideoId;
  visit += 1;
  if (nextVideoId === null) {
    flagHost.style.display = "none";
    root.render(null);
    return;
  }

  root.render(
    <CacheProvider value={emotionCache}>
      <FlagControl key={`${nextVideoId}:${visit}`} videoId={nextVideoId} onFlag={requestFlag} />
    </CacheProvider>,
  );
  flagHost.style.display = "block";
  console.info("[Shorts Flagger] Current Shorts videoId:", nextVideoId);
}

checkCurrentShorts();
window.addEventListener("popstate", checkCurrentShorts);
window.addEventListener("yt-navigate-finish", checkCurrentShorts);

// YouTube's internal navigation events are not a stable API. This also catches URL
// changes from Shorts swipes or navigation paths that do not emit those events.
window.setInterval(checkCurrentShorts, 500);
