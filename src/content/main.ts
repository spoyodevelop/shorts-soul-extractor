const SHORTS_PATH = /^\/shorts\/([A-Za-z0-9_-]+)\/?$/;

const flagHost = document.createElement("div");
flagHost.style.display = "none";

const shadow = flagHost.attachShadow({ mode: "closed" });
const style = document.createElement("style");
style.textContent = `
  :host {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2147483647;
    font: 14px/1.4 system-ui, sans-serif;
  }

  button {
    display: block;
    width: 100%;
    padding: 10px 16px;
    border: 0;
    border-radius: 999px;
    background: #d32f2f;
    color: white;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 10px #0005;
  }

  button:hover { background: #b71c1c; }
  button:focus-visible { outline: 3px solid white; outline-offset: 2px; }

  p {
    margin: 6px 0 0;
    padding: 5px 8px;
    border-radius: 6px;
    background: #222;
    color: white;
    text-align: center;
  }
`;

const flagButton = document.createElement("button");
flagButton.type = "button";
flagButton.textContent = "Flag";

const flagStatus = document.createElement("p");
flagStatus.setAttribute("role", "status");
flagStatus.textContent = "아직 저장되지 않습니다";

shadow.append(style, flagButton, flagStatus);
document.documentElement.append(flagHost);

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
    flagHost.style.display = "none";
    return;
  }

  flagStatus.textContent = "아직 저장되지 않습니다";
  flagHost.style.display = "";
  console.info("[Shorts Flagger] Current Shorts videoId:", nextVideoId);
}

flagButton.addEventListener("click", (event) => {
  event.stopPropagation();

  const videoId = getCurrentShortsVideoId();
  if (videoId === null) {
    checkCurrentShorts();
    return;
  }

  flagStatus.textContent = "Flag 입력됨 · 아직 저장되지 않음";
  console.info("[Shorts Flagger] Flag requested (not saved):", {
    videoId,
    url: window.location.href,
    flaggedAt: new Date().toISOString(),
  });
});

checkCurrentShorts();
window.addEventListener("popstate", checkCurrentShorts);
window.addEventListener("yt-navigate-finish", checkCurrentShorts);

// YouTube's internal navigation events are not a stable API. This also catches URL
// changes from Shorts swipes or navigation paths that do not emit those events.
window.setInterval(checkCurrentShorts, 500);
