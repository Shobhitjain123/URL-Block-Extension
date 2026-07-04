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
const clearHistoryBtn = document.getElementById("clear-history-btn");
const historyEmpty = document.getElementById("history-empty");
const historyList = document.getElementById("history-list");

/** @type {"preset" | "custom" | "midnight"} */
let durationMode = "preset";
/** @type {number} */
let selectedPresetHours = 1;

let countdownTimer = null;
/** @type {Record<string, object>} */
let activeBlocks = {};
/** @type {object[]} */
let historyEntries = [];
let clearHistoryConfirmPending = false;

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

/**
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  if (ms <= 0) {
    return "0m";
  }

  const totalMinutes = Math.round(ms / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || hours === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ");
}

/**
 * @param {number} hours
 * @param {number} minutes
 * @returns {number | null}
 */
function computeExpiresAtFromParts(hours, minutes) {
  const totalMs = Math.max(0, hours) * HOUR_MS + Math.max(0, minutes) * MINUTE_MS;
  if (totalMs <= 0) {
    return null;
  }
  return Date.now() + totalMs;
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
    renderHistory();
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
      renderHistory();
    }
  } catch (error) {
    console.error("Failed to load active blocks:", error);
  }
}

async function loadHistory() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_HISTORY" });
    if (response?.status === "ok") {
      historyEntries = response.history ?? [];
      renderHistory();
    }
  } catch (error) {
    console.error("Failed to load history:", error);
  }
}

function renderHistory() {
  const visible = historyEntries.filter(
    (entry) => !activeBlocks[entry.domain]
  );

  clearHistoryBtn.hidden = visible.length === 0;

  if (visible.length === 0) {
    historyEmpty.hidden = false;
    historyList.hidden = true;
    historyList.replaceChildren();
    return;
  }

  historyEmpty.hidden = true;
  historyList.hidden = false;
  historyList.replaceChildren();

  for (const entry of visible) {
    const item = document.createElement("li");
    item.className = "history-item";
    item.dataset.domain = entry.domain;

    const header = document.createElement("div");
    header.className = "history-header";

    const domainEl = document.createElement("span");
    domainEl.className = "history-domain";
    domainEl.textContent = entry.domain;

    const durationEl = document.createElement("span");
    durationEl.className = "history-duration";
    durationEl.textContent = `Last: ${formatDuration(entry.lastDurationMs)}`;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "history-remove-btn";
    removeBtn.setAttribute("aria-label", `Remove ${entry.domain} from history`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      removeHistoryEntry(entry.domain);
    });

    header.append(domainEl, durationEl, removeBtn);
    item.append(header);

    if (entry.reason) {
      const reasonEl = document.createElement("span");
      reasonEl.className = "history-reason";
      reasonEl.textContent = entry.reason;
      item.append(reasonEl);
    }

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const restartBtn = document.createElement("button");
    restartBtn.type = "button";
    restartBtn.className = "history-action-btn history-action-btn--primary";
    restartBtn.textContent = "Restart";
    restartBtn.addEventListener("click", () => {
      restartHistoryBlock(entry);
    });

    const customToggleBtn = document.createElement("button");
    customToggleBtn.type = "button";
    customToggleBtn.className = "history-action-btn";
    customToggleBtn.textContent = "Custom";
    customToggleBtn.setAttribute("aria-expanded", "false");

    const customPanel = document.createElement("div");
    customPanel.className = "history-custom-panel";
    customPanel.hidden = true;

    const customInputs = document.createElement("div");
    customInputs.className = "history-custom-inputs";

    const hoursLabel = document.createElement("label");
    hoursLabel.className = "history-duration-unit";
    const hoursInput = document.createElement("input");
    hoursInput.type = "number";
    hoursInput.min = "0";
    hoursInput.max = "168";
    hoursInput.value = "0";
    hoursInput.setAttribute("aria-label", "Hours");
    hoursLabel.append(hoursInput, document.createTextNode(" hr"));

    const minutesLabel = document.createElement("label");
    minutesLabel.className = "history-duration-unit";
    const minutesInput = document.createElement("input");
    minutesInput.type = "number";
    minutesInput.min = "0";
    minutesInput.max = "59";
    minutesInput.value = "30";
    minutesInput.setAttribute("aria-label", "Minutes");
    minutesLabel.append(minutesInput, document.createTextNode(" min"));

    customInputs.append(hoursLabel, minutesLabel);

    const setBtn = document.createElement("button");
    setBtn.type = "button";
    setBtn.className = "history-action-btn history-action-btn--primary";
    setBtn.textContent = "Set";
    setBtn.addEventListener("click", () => {
      customHistoryBlock(entry, hoursInput, minutesInput);
    });

    customPanel.append(customInputs, setBtn);

    customToggleBtn.addEventListener("click", () => {
      const expanded = customPanel.hidden;
      customPanel.hidden = !expanded;
      customToggleBtn.setAttribute("aria-expanded", String(expanded));
      customToggleBtn.classList.toggle("history-action-btn--selected", expanded);
    });

    actions.append(restartBtn, customToggleBtn);
    item.append(actions, customPanel);
    historyList.append(item);
  }
}

/**
 * @param {{ domain: string, expiresAt: number, reason?: string }} params
 * @returns {Promise<boolean>}
 */
async function addBlock({ domain, expiresAt, reason = "" }) {
  const normalizedDomain = normalizeToDomain(domain) ?? domain;

  if (expiresAt <= Date.now()) {
    showFormFeedback("Choose a duration of at least 1 minute.", "error");
    return false;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: "ADD_BLOCK",
      domain,
      expiresAt,
      reason,
    });

    switch (response?.status) {
      case "ok":
        showFormFeedback(
          `Locked ${normalizedDomain} until the timer expires.`,
          "success"
        );
        await loadActiveBlocks();
        await loadHistory();
        return true;

      case "already_blocked": {
        const remaining = formatRemaining(response.expiresAt - Date.now());
        showFormFeedback(
          `${normalizedDomain} is already locked — ${remaining} remaining.`,
          "warning"
        );
        await loadActiveBlocks();
        await loadHistory();
        return false;
      }

      case "invalid":
        showFormFeedback("Could not create block. Check the URL and duration.", "error");
        return false;

      default:
        showFormFeedback("Something went wrong. Try again.", "error");
        return false;
    }
  } catch (error) {
    console.error("ADD_BLOCK failed:", error);
    showFormFeedback("Could not reach the extension background.", "error");
    return false;
  }
}

/**
 * @param {{ domain: string, lastDurationMs: number, reason?: string }} entry
 */
async function restartHistoryBlock(entry) {
  clearFormFeedback();
  await addBlock({
    domain: entry.domain,
    expiresAt: Date.now() + entry.lastDurationMs,
    reason: entry.reason ?? "",
  });
}

/**
 * @param {{ domain: string, reason?: string }} entry
 * @param {HTMLInputElement} hoursInput
 * @param {HTMLInputElement} minutesInput
 */
async function customHistoryBlock(entry, hoursInput, minutesInput) {
  clearFormFeedback();

  const hours = Math.max(0, Number(hoursInput.value) || 0);
  const minutes = Math.max(0, Number(minutesInput.value) || 0);
  const expiresAt = computeExpiresAtFromParts(hours, minutes);

  if (expiresAt == null) {
    showFormFeedback("Choose a duration of at least 1 minute.", "error");
    return;
  }

  await addBlock({
    domain: entry.domain,
    expiresAt,
    reason: entry.reason ?? "",
  });
}

/**
 * @param {string} domain
 */
async function removeHistoryEntry(domain) {
  clearFormFeedback();

  try {
    const response = await chrome.runtime.sendMessage({
      type: "REMOVE_HISTORY",
      domain,
    });

    if (response?.status === "ok") {
      await loadHistory();
      return;
    }

    showFormFeedback("Could not remove that entry.", "error");
  } catch (error) {
    console.error("REMOVE_HISTORY failed:", error);
    showFormFeedback("Could not reach the extension background.", "error");
  }
}

async function handleClearHistory() {
  if (!clearHistoryConfirmPending) {
    clearHistoryConfirmPending = true;
    clearHistoryBtn.textContent = "Confirm?";
    return;
  }

  clearHistoryConfirmPending = false;
  clearHistoryBtn.textContent = "Clear all";
  clearFormFeedback();

  try {
    const response = await chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" });
    if (response?.status === "ok") {
      await loadHistory();
      return;
    }

    showFormFeedback("Could not clear history.", "error");
  } catch (error) {
    console.error("CLEAR_HISTORY failed:", error);
    showFormFeedback("Could not reach the extension background.", "error");
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

  const expiresAt = computeExpiresAt();

  if (expiresAt == null || expiresAt <= Date.now()) {
    showFormFeedback("Choose a duration of at least 1 minute.", "error");
    return;
  }

  submitBtn.disabled = true;

  try {
    const ok = await addBlock({
      domain: rawUrl,
      expiresAt,
      reason: reasonInput.value.trim(),
    });

    if (ok) {
      urlInput.value = "";
      reasonInput.value = "";
      updateDomainHint();
    }
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
clearHistoryBtn.addEventListener("click", handleClearHistory);

setDurationMode("preset", 1);
loadActiveBlocks();
loadHistory();
countdownTimer = setInterval(tickCountdowns, 1000);

window.addEventListener("unload", () => {
  if (countdownTimer != null) {
    clearInterval(countdownTimer);
  }
});
