const DEFAULT_NEXT_RULE_ID = 1;

/**
 * @returns {Promise<{ blocks: Record<string, object>, nextRuleId: number }>}
 */
export async function getState() {
  const data = await chrome.storage.local.get(["blocks", "nextRuleId"]);
  return {
    blocks: data.blocks ?? {},
    nextRuleId: data.nextRuleId ?? DEFAULT_NEXT_RULE_ID,
  };
}

/**
 * @param {Partial<{ blocks: Record<string, object>, nextRuleId: number }>} partial
 */
export async function setState(partial) {
  await chrome.storage.local.set(partial);
}

/**
 * @returns {Promise<Record<string, object>>}
 */
export async function getBlocks() {
  const { blocks } = await getState();
  return blocks;
}

/**
 * @param {{ domain: string, expiresAt: number, ruleId: number, createdAt: number, reason?: string }} block
 */
export async function upsertBlock(block) {
  const { blocks } = await getState();
  await chrome.storage.local.set({
    blocks: { ...blocks, [block.domain]: block },
  });
}

/**
 * @param {string} domain
 */
export async function removeBlock(domain) {
  const { blocks } = await getState();
  const next = { ...blocks };
  delete next[domain];
  await chrome.storage.local.set({ blocks: next });
}

/**
 * @returns {Promise<number>}
 */
export async function allocateRuleId() {
  const { nextRuleId } = await getState();
  await chrome.storage.local.set({ nextRuleId: nextRuleId + 1 });
  return nextRuleId;
}
