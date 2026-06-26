import { normalizeToDomain } from "./lib/domain.js";
import {
  allocateRuleId,
  getBlocks,
  removeBlock,
  upsertBlock,
} from "./lib/storage.js";

const ALARM_PREFIX = "block:";

/** Chrome alarms may not fire sooner than ~1 minute; sweep enforces true expiresAt. */
const ALARM_MIN_DELAY_MS = 60_000;

/**
 * @param {string} domain
 * @param {number} ruleId
 */
function buildRule(domain, ruleId) {
  const blockedUrl =
    chrome.runtime.getURL("blocked.html") +
    "?domain=" +
    encodeURIComponent(domain);

  return {
    id: ruleId,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: blockedUrl },
    },
    condition: {
      requestDomains: [domain],
      resourceTypes: ["main_frame"],
    },
  };
}

/**
 * @param {string} domain
 */
function alarmNameForDomain(domain) {
  return ALARM_PREFIX + domain;
}

/**
 * @param {string} name
 * @returns {string | null}
 */
function parseDomainFromAlarmName(name) {
  if (!name.startsWith(ALARM_PREFIX)) {
    return null;
  }
  return name.slice(ALARM_PREFIX.length);
}

/**
 * Chrome alarms have a ~1 minute minimum; schedule at least that far out.
 * True expiry is still stored in expiresAt and enforced by sweepExpiredBlocks.
 * @param {number} expiresAt
 */
function alarmWhen(expiresAt) {
  return Math.max(expiresAt, Date.now() + ALARM_MIN_DELAY_MS);
}

/**
 * @param {string} domain
 * @param {number} expiresAt
 */
async function scheduleBlockAlarm(domain, expiresAt) {
  await chrome.alarms.create(alarmNameForDomain(domain), {
    when: alarmWhen(expiresAt),
  });
}

/**
 * @param {string} domain
 * @param {number | undefined} ruleId
 */
async function removeBlockAndRule(domain, ruleId) {
  if (ruleId != null) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId],
    });
  }
  await chrome.alarms.clear(alarmNameForDomain(domain));
  await removeBlock(domain);
}

/**
 * @param {string} domain
 * @param {{ ruleId: number }} block
 */
async function expireBlock(domain, block) {
  await removeBlockAndRule(domain, block.ruleId);
}

/** Remove any blocks past expiresAt (covers missed/delayed alarms). */
async function sweepExpiredBlocks() {
  const blocks = await getBlocks();
  const now = Date.now();

  for (const [domain, block] of Object.entries(blocks)) {
    if (block.expiresAt <= now) {
      await expireBlock(domain, block);
    }
  }
}

async function restoreBlocks() {
  await sweepExpiredBlocks();

  const blocks = await getBlocks();
  const now = Date.now();
  const dynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
  const rulesById = new Map(dynamicRules.map((rule) => [rule.id, rule]));
  const activeRuleIds = new Set();

  for (const [domain, block] of Object.entries(blocks)) {
    if (block.expiresAt <= now) {
      await expireBlock(domain, block);
      continue;
    }

    activeRuleIds.add(block.ruleId);

    if (!rulesById.has(block.ruleId)) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [buildRule(domain, block.ruleId)],
      });
    }

    await scheduleBlockAlarm(domain, block.expiresAt);
  }

  const orphanRuleIds = dynamicRules
    .map((rule) => rule.id)
    .filter((id) => !activeRuleIds.has(id));

  if (orphanRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: orphanRuleIds,
    });
  }
}

/**
 * @param {{ domain?: string, expiresAt?: number, reason?: string }} message
 */
async function handleAddBlock(message) {
  const domain = normalizeToDomain(message.domain ?? "");
  if (!domain) {
    return { status: "invalid" };
  }

  if (typeof message.expiresAt !== "number" || message.expiresAt <= Date.now()) {
    return { status: "invalid" };
  }

  const blocks = await getBlocks();
  const existing = blocks[domain];
  const now = Date.now();

  if (existing && existing.expiresAt > now) {
    return {
      status: "already_blocked",
      expiresAt: existing.expiresAt,
    };
  }

  if (existing) {
    await expireBlock(domain, existing);
  }

  const ruleId = await allocateRuleId();
  const block = {
    domain,
    expiresAt: message.expiresAt,
    ruleId,
    createdAt: now,
    reason: message.reason ?? "",
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [buildRule(domain, ruleId)],
  });
  await upsertBlock(block);
  await scheduleBlockAlarm(domain, message.expiresAt);

  return { status: "ok" };
}

async function handleGetBlocks() {
  const blocks = await getBlocks();
  const now = Date.now();
  const active = {};

  for (const [domain, block] of Object.entries(blocks)) {
    if (block.expiresAt > now) {
      active[domain] = block;
    }
  }

  return { status: "ok", blocks: active };
}

/**
 * @param {object} message
 */
async function handleMessage(message) {
  await sweepExpiredBlocks();

  switch (message.type) {
    case "ADD_BLOCK":
      return handleAddBlock(message);
    case "GET_BLOCKS":
      return handleGetBlocks();
    default:
      return { status: "unknown_message" };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch((error) => {
    console.error("Focus Lock message handler failed:", error);
    sendResponse({ status: "error" });
  });
  return true;
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  await sweepExpiredBlocks();

  const domain = parseDomainFromAlarmName(alarm.name);
  if (!domain) {
    return;
  }

  const blocks = await getBlocks();
  const block = blocks[domain];
  if (!block) {
    return;
  }

  await expireBlock(domain, block);
});

chrome.runtime.onStartup.addListener(() => {
  restoreBlocks().catch((error) => {
    console.error("Focus Lock startup restore failed:", error);
  });
});

chrome.runtime.onInstalled.addListener(() => {
  restoreBlocks().catch((error) => {
    console.error("Focus Lock install restore failed:", error);
  });
});

restoreBlocks().catch((error) => {
  console.error("Focus Lock service worker restore failed:", error);
});
