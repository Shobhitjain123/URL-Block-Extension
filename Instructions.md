# Focus Lock — Chrome Extension Build Plan

A Chrome extension that blocks distracting websites for a fixed time period with no way to undo the block early. Built on Manifest V3.

---

## Problem Statement

Context switching is a major productivity killer. The goal is a browser extension where you can:

- Add any URL (e.g. `netflix.com`) to a block list
- Set a block duration per URL
- Have the block enforced with no option to cancel it early
- Blocks expire automatically when the timer runs out
- Publish it so others can use it too

---

## Tech Stack

| Layer              | Technology                     |
| ------------------ | ------------------------------ |
| Extension platform | Chrome Extension (Manifest V3) |
| Blocking engine    | `chrome.declarativeNetRequest` |
| Persistence        | `chrome.storage.local`         |
| Timer / expiry     | `chrome.alarms`                |
| UI                 | HTML + vanilla JS (popup)      |

`chrome.declarativeNetRequest` is the right choice — it blocks URLs at the network level before the page even loads, making it truly bypass-proof within Chrome. No content script tricks that can be worked around.

---

## Architecture Overview

```
Popup UI  ──────────►  Background Service Worker  ──────────►  chrome.storage.local
(add URL,              (manages timers,                         (persists blocked URLs
 set duration)          enforces blocks)                         + expiry timestamps)
                               │
                               ▼
                    declarativeNetRequest
                    (Chrome's native block engine)
                               │
                               ▼
                         blocked.html
                    (shown instead of the site,
                     displays countdown timer)
```

On browser restart or extension reload, the background worker reads `chrome.storage.local` and **re-applies all rules** that haven't expired yet. Blocks survive restarts.

---

## Files to Build

### `manifest.json`

Declares the extension and required permissions.

**Key permissions needed:**

- `declarativeNetRequest` — to add/remove URL block rules
- `storage` — to persist blocked URLs and expiry timestamps
- `alarms` — to schedule automatic rule removal on expiry
- `tabs` — to redirect the user when a blocked URL is accessed

---

### `popup.html` + `popup.js`

The user interface, accessible by clicking the extension icon.

**What it does:**

- Text input for entering a URL to block
- Duration picker with preset options: 1h / 2h / 4h / until midnight / custom
- On submit: sends a message to the background service worker with the URL + expiry timestamp
- Active blocks list — shows all currently blocked URLs with their remaining time (read-only, no cancel button)

---

### `background.js` (Service Worker)

The brain of the extension. Runs in the background, persists across tabs.

**On receiving a block request from the popup:**

1. Saves `{ url, expiresAt }` to `chrome.storage.local`
2. Calls `chrome.declarativeNetRequest.updateDynamicRules()` to activate the block
3. Sets a `chrome.alarms` alarm keyed to the URL, firing at the expiry timestamp

**On alarm fire (expiry):**

1. Removes the dynamic rule for that URL
2. Clears the entry from `chrome.storage.local`

**On extension startup / browser restart:**

1. Reads all entries from `chrome.storage.local`
2. For entries that haven't expired: re-applies the dynamic block rules
3. For entries that have already expired: cleans them up silently

---

### `blocked.html`

The redirect target shown when a user tries to visit a blocked site.

**What it shows:**

- Name of the blocked site
- Live countdown to when the block expires
- A short motivational message or the reason the user set the block (optional)
- No bypass button — purely informational

---

## The "Cannot Undo" Mechanism

This is the critical design decision. Here's how it's enforced:

- **No unlock button exists anywhere in the UI** — the popup only displays remaining time
- The expiry timestamp in `chrome.storage.local` is the single source of truth
- Block rules are re-applied automatically on every startup before the user can interact with the extension
- The alarm handles expiry automatically — no polling or manual intervention needed

### Known limitation

A determined user can go to `chrome://extensions`, disable the extension entirely, and bypass all blocks. For a personal productivity tool this is acceptable — the friction is the feature. Enforcing it further would require a companion native app, which is overkill for most use cases.

---

## Edge Cases to Handle

| Case                                   | Handling                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Subdomains (e.g. `www.netflix.com`)    | Block `*.netflix.com` using a wildcard rule pattern                         |
| Browser restart                        | Re-apply all non-expired rules on `chrome.runtime.onStartup`                |
| Multiple simultaneous blocks           | Each URL gets its own alarm key and storage entry                           |
| Duplicate URL submission               | Check existing blocks before adding; show remaining time if already blocked |
| Invalid URL input                      | Validate format before accepting; show inline error                         |
| Block expiring while browser is closed | Clean up stale entries on next startup                                      |

---

## Build Phases

### Phase 1 — Core block engine (1–2 days)

- `manifest.json` with correct permissions
- Background worker with `declarativeNetRequest` rule management
- `chrome.storage.local` read/write
- `chrome.alarms` setup and expiry handler
- `chrome.runtime.onStartup` listener to restore blocks after restart
- Manual test: block a URL and verify it redirects

### Phase 2 — Popup UI (1 day)

- URL input field with validation
- Duration picker: preset buttons + custom input
- Active blocks list with live countdown display
- Message passing between popup and background worker

### Phase 3 — Blocked page (half day)

- `blocked.html` with live JavaScript countdown
- Display the blocked site name and expiry time
- Clean, distraction-free design with a motivational message

### Phase 4 — Edge cases (1 day)

- Wildcard subdomain blocking
- Restart persistence testing
- Duplicate block detection
- Input validation and error states
- Multiple simultaneous block stress test

### Phase 5 — Polish + publish

- Design extension icons (16px, 48px, 128px)
- Write Chrome Web Store listing copy
- Take store screenshots (1280×800 or 640×400)
- Record a short demo video
- Write privacy policy page (required for store submission)
- Submit for review

---

## Chrome Web Store Publishing

**Requirements:**

- Google developer account — $5 one-time registration fee
- Privacy policy URL (host a simple page; since all data stays on-device, the policy is straightforward)
- At least one screenshot at 1280×800 or 640×400
- 128×128 icon

**Privacy policy note:** The extension stores URLs and timestamps locally on the user's device using `chrome.storage.local`. No data is sent to any server. Your privacy policy should state this explicitly — it's a store requirement.

**Review timeline:** MV3 extensions using `declarativeNetRequest` are typically reviewed in 1–3 business days.

---

## Summary

| Item                 | Detail                                         |
| -------------------- | ---------------------------------------------- |
| Platform             | Chrome Extension, Manifest V3                  |
| Blocking method      | `chrome.declarativeNetRequest` (network-level) |
| Persistence          | `chrome.storage.local`                         |
| Expiry               | `chrome.alarms` (auto, no polling)             |
| Undo possible?       | No — by design                                 |
| Restart-safe?        | Yes — blocks re-applied on startup             |
| Store publishing     | Chrome Web Store, $5 dev fee                   |
| Estimated build time | 4–6 days across 5 phases                       |
