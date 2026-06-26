# Focus Lock — Chrome Web Store Listing Copy

Use the fields below when submitting to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## Extension name

**Focus Lock**

---

## Short description (max 132 characters)

Block distracting sites for a fixed time. No early undo. Covers subdomains and every path under the domain.

*(131 characters)*

---

## Detailed description

Focus Lock helps you stay on task by blocking distracting websites for a duration you choose — with no way to cancel early.

**How it works**

1. Click the extension icon and enter a website (for example, `netflix.com` or a full URL).
2. Pick how long to lock it: 1 hour, 2 hours, 4 hours, until midnight, or a custom duration.
3. Optionally add a reason to remind yourself why you locked the site.
4. Visit the site later and you’ll see a calm blocked page with a live countdown until the lock expires.

**Whole-domain blocking**

Entering `netflix.com` blocks the entire domain — including `www.netflix.com`, other subdomains, and every path such as `/browse` or `/title/123`. Paste a long URL and Focus Lock normalizes it to the registrable domain automatically.

**No early undo — by design**

Once a block is set, there is no unlock button. Re-adding an active domain shows the remaining time instead of resetting the timer. Blocks expire automatically when the timer runs out.

**Survives restarts**

Active blocks are restored when Chrome or the extension reloads. Expired blocks are cleaned up automatically.

**Privacy-first**

All data (blocked domains, timestamps, and optional reasons) is stored locally on your device using Chrome’s local storage. Nothing is sent to any server.

**Known limitation**

A determined user can disable the extension from `chrome://extensions`. For personal productivity, that friction is acceptable — the goal is to make impulsive browsing harder, not impossible.

---

## Category

**Productivity**

---

## Language

**English**

---

## Privacy policy URL

Host `privacy-policy.html` from this repository (for example, via GitHub Pages) and paste the public URL here.

Example after enabling GitHub Pages on the repo:

`https://<your-username>.github.io/<repo-name>/privacy-policy.html`

---

## Permissions justification (for store review form)

| Permission | Justification |
| --- | --- |
| `declarativeNetRequest` | Redirects main-frame navigation to blocked domains before pages load. |
| `storage` | Persists active blocks, expiry timestamps, and optional reasons locally on the user’s device. |
| `alarms` | Removes blocks automatically when their timer expires, including after browser restarts. |
| `tabs` | Supports redirect behavior when the user navigates to a blocked site. |
| Host permission `<all_urls>` | Required so users can block any website they choose; rules only apply to domains the user explicitly adds. |

---

## Single-purpose description

Focus Lock is a productivity tool that lets users temporarily block distracting websites for a fixed duration with no early cancellation.

---

## Store icon (128×128, required)

Upload this file in the Developer Dashboard under **Store listing → Graphic assets → Store icon**:

`store/store-icon-128.png`

Requirements: **128×128 PNG**, square, no transparency. This is separate from the extension zip upload.

Alternative: `icons/icon128.png` also works if the dashboard accepts it.

Regenerate both with: `python3 scripts/generate-icons.py`

---

Include at least one screenshot at **1280×800** or **640×400**. Pre-generated assets are in `store/screenshots/`:

1. `01-popup-add-block.png` — popup with URL input, duration picker, and active blocks
2. `02-blocked-page.png` — blocked page with countdown
3. `03-duration-picker.png` — duration presets and custom time

Regenerate with: `python3 scripts/generate-screenshots.py`

---

## Promotional images (optional)

- **Small promo tile:** 440×280 — can crop from screenshot 1
- **Marquee promo tile:** 1400×560 — optional for featured placement

---

## Demo video (optional, recommended)

Record a 30–60 second screen capture showing:

1. Opening the popup and adding a block for a test domain
2. Navigating to that domain and seeing the blocked page with countdown
3. Showing the active block in the popup list

Upload to YouTube (unlisted is fine) and paste the link in the store listing.

See `store/demo-video-script.md` for a shot list.

---

## Developer account

Register at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). One-time registration fee: **$5 USD**.

---

## Package and submit checklist

- [ ] Run `bash scripts/package.sh` to create `dist/focus-lock.zip`
- [ ] Load unpacked from the project root and smoke-test before upload
- [ ] Host `privacy-policy.html` and copy the public URL into the listing
- [ ] Upload `dist/focus-lock.zip` in the Developer Dashboard
- [ ] Fill in name, short description, detailed description, category, language
- [ ] Upload icon (128×128 is taken from the package) and at least one screenshot
- [ ] Paste privacy policy URL
- [ ] Complete permissions justification fields
- [ ] Submit for review (typically 1–3 business days for MV3 + declarativeNetRequest)
