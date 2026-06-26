# Focus Lock

A Chrome extension that blocks distracting websites for a fixed duration — with no early undo. Built on Manifest V3 using `chrome.declarativeNetRequest`.

## Features

- Block any website by domain (paths and subdomains included automatically)
- Duration presets: 1h, 2h, 4h, until midnight, or custom hours/minutes
- Optional reason shown on the blocked page
- Live countdown in the popup and on the blocked page
- Blocks survive browser restarts; expired blocks clean up automatically
- All data stored locally — nothing sent to any server

## Install (development)

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this project folder (the directory containing `manifest.json`).
5. Click the Focus Lock icon in the toolbar to add a block.

## Generate publish assets

```bash
# Icons (16 / 48 / 128 px)
python3 scripts/generate-icons.py

# Store screenshots (1280×800 PNGs)
python3 scripts/generate-screenshots.py

# Extension zip for Chrome Web Store upload
bash scripts/package.sh
```

Outputs:

| Asset | Location |
| --- | --- |
| Icons | `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` |
| Screenshots | `store/screenshots/*.png` |
| Store package | `dist/focus-lock.zip` |
| Privacy policy | `privacy-policy.html` |
| Listing copy | `store-listing.md` |

## Publish to Chrome Web Store

1. **Developer account** — Register at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) ($5 one-time fee).
2. **Privacy policy** — Host `privacy-policy.html` (e.g. GitHub Pages) and note the public URL.
3. **Package** — Run `bash scripts/package.sh` and upload `dist/focus-lock.zip`.
4. **Listing** — Copy text from `store-listing.md` (name, descriptions, permissions justification).
5. **Screenshots** — Upload at least one PNG from `store/screenshots/`.
6. **Demo video** (optional) — Follow `store/demo-video-script.md`.
7. **Submit** — Complete the dashboard form and submit for review (typically 1–3 business days).

See `store-listing.md` for the full submission checklist.

## Project structure

```
manifest.json          Extension manifest (MV3)
popup.html             Extension popup UI
blocked.html           Shown when a blocked site is visited
privacy-policy.html    Privacy policy for store submission
src/
  background.js        Service worker: rules, alarms, storage
  popup.js / popup.css Popup logic and styles
  blocked.js / blocked.css Blocked page logic and styles
  lib/
    domain.js          URL → registrable domain normalization
    storage.js         chrome.storage.local helpers
icons/                 16 / 48 / 128 px extension icons
store/                 Screenshots, mockups, demo video script
scripts/               Icon, screenshot, and packaging scripts
```

## Known limitation

Users can disable the extension from `chrome://extensions`. For personal productivity use, that friction is acceptable by design.

## License

MIT (or adjust as needed for your distribution).
