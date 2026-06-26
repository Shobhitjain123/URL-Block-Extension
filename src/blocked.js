import { getBlocks } from "./lib/storage.js";

const DEFAULT_MESSAGE = "Stay focused — you chose this lock for a reason.";

/**
 * @param {number} ms
 */
function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * @returns {string | null}
 */
function getDomainFromQuery() {
  const params = new URLSearchParams(location.search);
  const domain = params.get("domain");
  return domain ? domain.trim().toLowerCase() : null;
}

const domain = getDomainFromQuery();
const activeView = document.getElementById("active-view");
const endedView = document.getElementById("ended-view");
const domainNameEl = document.getElementById("domain-name");
const countdownEl = document.getElementById("countdown");
const reasonEl = document.getElementById("reason");

/** @type {number | null} */
let countdownTimer = null;

function showEndedView() {
  if (countdownTimer != null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  activeView.hidden = true;
  endedView.hidden = false;
}

/**
 * @param {{ expiresAt: number, reason?: string }} block
 */
function showActiveView(block) {
  endedView.hidden = true;
  activeView.hidden = false;

  if (domain) {
    domainNameEl.textContent = domain;
  }

  const reason = block.reason?.trim();
  if (reason) {
    reasonEl.textContent = reason;
    reasonEl.hidden = false;
  } else {
    reasonEl.textContent = DEFAULT_MESSAGE;
    reasonEl.hidden = false;
  }

  const tick = () => {
    const remaining = block.expiresAt - Date.now();

    if (remaining <= 0) {
      showEndedView();
      return;
    }

    countdownEl.textContent = formatRemaining(remaining);
  };

  tick();
  countdownTimer = window.setInterval(tick, 1000);
}

async function init() {
  if (!domain) {
    showEndedView();
    return;
  }

  const blocks = await getBlocks();
  const block = blocks[domain];

  if (!block || block.expiresAt <= Date.now()) {
    showEndedView();
    return;
  }

  showActiveView(block);
}

init().catch((error) => {
  console.error("Focus Lock blocked page failed:", error);
  showEndedView();
});
