/**
 * Multi-part public suffixes (longest match wins). Fallback: last two labels.
 * Curated list — dependency-free handling of common ccTLD compound suffixes.
 */
const MULTI_PART_SUFFIXES = new Set([
  "ac.uk",
  "co.in",
  "co.jp",
  "co.kr",
  "co.nz",
  "co.uk",
  "co.za",
  "com.au",
  "com.br",
  "com.hk",
  "com.mx",
  "com.sg",
  "com.tw",
  "gov.uk",
  "net.au",
  "org.uk",
]);

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[\da-f:]+$/i;

function isIpAddress(hostname) {
  if (IPV4_RE.test(hostname)) {
    return hostname.split(".").every((octet) => {
      const n = Number(octet);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }
  if (hostname.includes(":") && IPV6_RE.test(hostname)) {
    return true;
  }
  return false;
}

function toRegistrableDomain(hostname) {
  const labels = hostname.split(".").filter(Boolean);
  if (labels.length < 2) {
    return null;
  }

  let suffixLen = 1;
  for (let len = Math.min(4, labels.length - 1); len >= 2; len--) {
    const candidate = labels.slice(-len).join(".");
    if (MULTI_PART_SUFFIXES.has(candidate)) {
      suffixLen = len;
      break;
    }
  }

  const domainLen = suffixLen + 1;
  if (labels.length < domainLen) {
    return null;
  }

  return labels.slice(-domainLen).join(".");
}

/**
 * Normalize user input to a registrable domain (eTLD+1), or null if invalid.
 * @param {string} input
 * @returns {string | null}
 */
export function normalizeToDomain(input) {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  let url;
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  let hostname = url.hostname.toLowerCase();
  if (!hostname) {
    return null;
  }

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return null;
  }

  if (isIpAddress(hostname)) {
    return null;
  }

  if (hostname.startsWith("www.")) {
    hostname = hostname.slice(4);
  }

  return toRegistrableDomain(hostname);
}

/**
 * @param {string} input
 * @returns {boolean}
 */
export function isValidDomainInput(input) {
  return normalizeToDomain(input) !== null;
}

/**
 * User-facing validation message, or null when input is valid.
 * @param {string} input
 * @returns {string | null}
 */
export function getDomainInputError(input) {
  if (typeof input !== "string" || !input.trim()) {
    return "Enter a website to block (e.g. netflix.com)";
  }

  const trimmed = input.trim();

  let url;
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    url = new URL(withScheme);
  } catch {
    return "Enter a valid website (e.g. netflix.com)";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Only http(s) websites can be blocked";
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname) {
    return "Enter a valid website (e.g. netflix.com)";
  }

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return "localhost cannot be blocked";
  }

  if (isIpAddress(hostname)) {
    return "IP addresses cannot be blocked — enter a domain name";
  }

  if (toRegistrableDomain(hostname.startsWith("www.") ? hostname.slice(4) : hostname) == null) {
    return "Enter a valid website (e.g. netflix.com)";
  }

  return null;
}
