const SHORTS_PATH = /^\/shorts\/([A-Za-z0-9_-]+)\/?$/;

function getCurrentShortsVideoId(): string | null {
  const match = SHORTS_PATH.exec(window.location.pathname);
  if (!match) {
    return null;
  }

  return match[1];
}

let currentVideoId: string | null = null;

function checkCurrentShorts(): void {
  const nextVideoId = getCurrentShortsVideoId();
  if (nextVideoId === currentVideoId) {
    return;
  }

  currentVideoId = nextVideoId;
  if (nextVideoId === null) {
    return;
  }

  console.info("[Shorts Flagger] Current Shorts videoId:", nextVideoId);
}

checkCurrentShorts();
window.addEventListener("popstate", checkCurrentShorts);
window.addEventListener("yt-navigate-finish", checkCurrentShorts);

// YouTube's internal navigation events are not a stable API. This also catches URL
// changes from Shorts swipes or navigation paths that do not emit those events.
window.setInterval(checkCurrentShorts, 500);
