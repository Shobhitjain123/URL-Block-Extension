#!/usr/bin/env python3
"""Render store mockup HTML pages to 1280x800 PNG screenshots."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MOCKUPS = ROOT / "store" / "mockups"
OUTPUT = ROOT / "store" / "screenshots"

SHOTS = [
    ("popup.html", "01-popup-add-block.png"),
    ("blocked.html", "02-blocked-page.png"),
    ("duration.html", "03-duration-picker.png"),
]


def try_playwright() -> bool:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return False

    OUTPUT.mkdir(parents=True, exist_ok=True)
    for html, png in SHOTS:
        html_path = (MOCKUPS / html).resolve().as_uri()
        out_path = OUTPUT / png
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.goto(html_path)
            page.screenshot(path=str(out_path), type="png")
            browser.close()
        print(f"Wrote {out_path}")
    return True


def try_pillow_fallback() -> None:
    from PIL import Image, ImageDraw, ImageFont

    OUTPUT.mkdir(parents=True, exist_ok=True)

    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 42)
        body_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 22)
        small_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 16)
    except OSError:
        title_font = ImageFont.load_default()
        body_font = title_font
        small_font = title_font

    scenes = [
        (
            "01-popup-add-block.png",
            "#f7f6f3",
            "Block distractions. No early undo.",
            "Add a site, pick a duration, and stay focused until the timer runs out.",
        ),
        (
            "02-blocked-page.png",
            "#eef2f7",
            "Stay on track",
            "When you visit a locked site, Focus Lock shows a calm countdown — no bypass button.",
        ),
        (
            "03-duration-picker.png",
            "#f7f6f3",
            "Flexible durations",
            "Quick presets for common focus sessions, or set custom hours and minutes.",
        ),
    ]

    for filename, bg, title, subtitle in scenes:
        img = Image.new("RGB", (1280, 800), bg)
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle((80, 120, 620, 680), radius=20, fill="#ffffff", outline="#e7e5e4", width=2)
        draw.text((720, 200), title, fill="#1c1917", font=title_font)
        draw.text((720, 280), subtitle, fill="#57534e", font=body_font)
        draw.text((720, 400), "Focus Lock", fill="#0f766e", font=small_font)
        path = OUTPUT / filename
        img.save(path, format="PNG")
        print(f"Wrote {path} (Pillow fallback)")


def main() -> None:
    if try_playwright():
        return

    print("Playwright not available; installing...", file=sys.stderr)
    subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright", "-q"])
    subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])

    if try_playwright():
        return

    print("Playwright failed; using Pillow fallback.", file=sys.stderr)
    try_pillow_fallback()


if __name__ == "__main__":
    main()
