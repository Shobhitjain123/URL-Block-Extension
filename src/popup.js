import { getDomainInputError, normalizeToDomain } from "./lib/domain.js";

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

const form = document.getElementById("block-form");
const urlInput = document.getElementById("url-input");
const domainHint = document.getElementById("domain-hint");
const urlError = document.getElementById("url-error");
const reasonInput = document.getElementById("reason-input");
const formFeedback = document.getElementById("form-feedback");
const submitBtn = document.getElementById("submit-btn");
const presetButtons = document.querySelectorAll(".preset-btn");
const customHoursInput = document.getElementById("custom-hours");
const customMinutesInput = document.getElementById("custom-minutes");
const blocksEmpty = document.getElementById("blocks-empty");
const blocksList = document.getElementById("blocks-list");

/** @type {"preset" | "custom" | "midnight"} */
let durationMode = "preset";
/** @type {number} */
let selectedPresetHours = 1;

let countdownTimer = null;
/** @type {Record<string, object>} */
let activeBlocks = {};

function clearFormFeedback() {
  formFeedback.hidden = true;
  formFeedback.textContent = "";
  formFeedback.className = "form-feedback";
}

function showFormFeedback(message, type) {
  formFeedback.textContent = message;
  formFeedback.className = `form-feedback form-feedback--${type}`;
  formFeedback.hidden = false;
}

function updateDomainHint() {
  const value = urlInput.value.trim();
  if (!value) {
    domainHint.hidden = true;
    urlError.hidden = true;
    return;
  }

  const domain = normalizeToDomain(value);
  const error = getDomainInputError(value);
  if (domain) {
    domainHint.textContent = `Will block: ${domain} and everything under it`;
    domainHint.hidden = false;
    urlError.hidden = true;
  } else {
    domainHint.hidden = true;
    urlError.textContent = error ?? "Enter a valid website (e.g. netflix.com)";
    urlError.hidden = false;
  }
}

function setDurationMode(mode, presetHours) {
  durationMode = mode;
  if (presetHours != null) {
    selectedPresetHours = presetHours;
  }

  presetButtons.forEach((btn) => {
    const isMidnight = btn.hasAttribute("data-midnight");
    const hours = btn.dataset.hours ? Number(btn.dataset.hours) : null;
    const selected =
      (mode === "midnight" && isMidnight) ||
      (mode === "preset" && hours === selectedPresetHours);
    btn.classList.toggle("preset-btn--selected", selected);
  });
}

function computeExpiresAt() {
  const now = Date.now();

  if (durationMode === "midnight") {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime();
  }

  if (durationMode === "custom") {
    const hours = Math.max(0, Number(customHoursInput.value) || 0);
    const minutes = Math.max(0, Number(customMinutesInput.value) || 0);
    const totalMs = hours * HOUR_MS + minutes * MINUTE_MS;
    if (totalMs <= 0) {
      return null;
    }
    return now + totalMs;
  }

  return now + selectedPresetHours * HOUR_MS;
}

/**
 * @param {number} ms
 * @returns {string}
 */
function formatRemaining(ms) {
  if (ms <= 0) {
    return "0s";
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}m`);
  }
  if (hours === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(" ");
}

function renderActiveBlocks() {
  const entries = Object.values(activeBlocks).sort(
    (a, b) => a.expiresAt - b.expiresAt
  );
  const now = Date.now();
  const live = entries.filter((block) => block.expiresAt > now);

  if (live.length === 0) {
    blocksEmpty.hidden = false;
    blocksList.hidden = true;
    blocksList.replaceChildren();
    return;
  }

  blocksEmpty.hidden = true;
  blocksList.hidden = false;
  blocksList.replaceChildren();

  for (const block of live) {
    const item = document.createElement("li");
    item.className = "block-item";
    item.dataset.domain = block.domain;

    const domainEl = document.createElement("span");
    domainEl.className = "block-domain";
    domainEl.textContent = block.domain;

    const countdownEl = document.createElement("span");
    countdownEl.className = "block-countdown";
    countdownEl.textContent = formatRemaining(block.expiresAt - now);

    const noteEl = document.createElement("span");
    noteEl.className = "block-note";
    noteEl.textContent = "Includes subdomains & all paths";

    if (block.reason) {
      const reasonEl = document.createElement("span");
      reasonEl.className = "block-reason";
      reasonEl.textContent = block.reason;
      item.append(domainEl, countdownEl, reasonEl, noteEl);
    } else {
      item.append(domainEl, countdownEl, noteEl);
    }

    blocksList.append(item);
  }
}

function tickCountdowns() {
  const now = Date.now();
  let changed = false;

  for (const [domain, block] of Object.entries(activeBlocks)) {
    if (block.expiresAt <= now) {
      delete activeBlocks[domain];
      changed = true;
    }
  }

  if (changed) {
    renderActiveBlocks();
    return;
  }

  const items = blocksList.querySelectorAll(".block-item");
  for (const item of items) {
    const domain = item.dataset.domain;
    const block = activeBlocks[domain];
    if (!block) {
      continue;
    }
    const countdownEl = item.querySelector(".block-countdown");
    if (countdownEl) {
      countdownEl.textContent = formatRemaining(block.expiresAt - now);
    }
  }
}

async function loadActiveBlocks() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_BLOCKS" });
    if (response?.status === "ok") {
      activeBlocks = response.blocks ?? {};
      renderActiveBlocks();
    }
  } catch (error) {
    console.error("Failed to load active blocks:", error);
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  clearFormFeedback();

  const rawUrl = urlInput.value.trim();
  const inputError = getDomainInputError(rawUrl);
  if (inputError) {
    urlError.textContent = inputError;
    urlError.hidden = false;
    urlInput.focus();
    return;
  }

  const domain = normalizeToDomain(rawUrl);
  const expiresAt = computeExpiresAt();

  if (expiresAt == null || expiresAt <= Date.now()) {
    showFormFeedback("Choose a duration of at least 1 minute.", "error");
    return;
  }

  // Sub-minute values are rejected above; alarms also have a ~1 min minimum,
  // but expiresAt is enforced immediately via the background expiry sweep.

  submitBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "ADD_BLOCK",
      domain: rawUrl,
      expiresAt,
      reason: reasonInput.value.trim(),
    });

    switch (response?.status) {
      case "ok":
        showFormFeedback(`Locked ${domain} until the timer expires.`, "success");
        urlInput.value = "";
        reasonInput.value = "";
        updateDomainHint();
        await loadActiveBlocks();
        break;

      case "already_blocked": {
        const remaining = formatRemaining(response.expiresAt - Date.now());
        showFormFeedback(
          `${domain} is already locked — ${remaining} remaining.`,
          "warning"
        );
        await loadActiveBlocks();
        break;
      }

      case "invalid":
        showFormFeedback("Could not create block. Check the URL and duration.", "error");
        break;

      default:
        showFormFeedback("Something went wrong. Try again.", "error");
        break;
    }
  } catch (error) {
    console.error("ADD_BLOCK failed:", error);
    showFormFeedback("Could not reach the extension background.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

presetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.hasAttribute("data-midnight")) {
      setDurationMode("midnight");
    } else {
      setDurationMode("preset", Number(btn.dataset.hours));
    }
  });
});

function onCustomDurationChange() {
  setDurationMode("custom");
}

customHoursInput.addEventListener("input", onCustomDurationChange);
customMinutesInput.addEventListener("input", onCustomDurationChange);
customHoursInput.addEventListener("focus", onCustomDurationChange);
customMinutesInput.addEventListener("focus", onCustomDurationChange);

urlInput.addEventListener("input", updateDomainHint);
form.addEventListener("submit", handleSubmit);

setDurationMode("preset", 1);
loadActiveBlocks();
countdownTimer = setInterval(tickCountdowns, 1000);

window.addEventListener("unload", () => {
  if (countdownTimer != null) {
    clearInterval(countdownTimer);
  }
});
