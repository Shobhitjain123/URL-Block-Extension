#!/usr/bin/env python3
"""Generate Focus Lock extension icons at 16, 48, and 128 px."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ICONS_DIR = ROOT / "icons"
STORE_DIR = ROOT / "store"
SIZES = (16, 48, 128)

BG = (15, 118, 110)  # #0f766e
LOCK = (255, 255, 255)
SHADOW = (13, 94, 88)  # slightly darker teal


def draw_lock(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = max(1, round(size * 0.08))
    radius = max(2, round(size * 0.22))
    draw.rounded_rectangle(
        (pad, pad, size - pad - 1, size - pad - 1),
        radius=radius,
        fill=BG,
    )

    cx = size / 2
    body_w = size * 0.42
    body_h = size * 0.30
    body_top = size * 0.46
    body_left = cx - body_w / 2
    body_right = cx + body_w / 2
    body_bottom = body_top + body_h
    lock_radius = max(1, round(size * 0.08))

    shackle_w = size * 0.34
    shackle_h = size * 0.22
    shackle_left = cx - shackle_w / 2
    shackle_top = size * 0.24
    shackle_thickness = max(2, round(size * 0.11))

    draw.arc(
        (
            shackle_left,
            shackle_top,
            shackle_left + shackle_w,
            shackle_top + shackle_h * 2,
        ),
        start=180,
        end=0,
        fill=LOCK,
        width=shackle_thickness,
    )

    draw.rounded_rectangle(
        (body_left, body_top, body_right, body_bottom),
        radius=lock_radius,
        fill=LOCK,
    )

    keyhole_r = max(1, round(size * 0.045))
    keyhole_y = body_top + body_h * 0.38
    draw.ellipse(
        (
            cx - keyhole_r,
            keyhole_y - keyhole_r,
            cx + keyhole_r,
            keyhole_y + keyhole_r,
        ),
        fill=BG,
    )
    slot_h = max(1, round(size * 0.09))
    slot_w = max(1, round(size * 0.05))
    draw.rectangle(
        (cx - slot_w / 2, keyhole_y, cx + slot_w / 2, keyhole_y + slot_h),
        fill=BG,
    )

    return img


def main() -> None:
    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = ICONS_DIR / f"icon{size}.png"
        draw_lock(size).save(path, format="PNG")
        print(f"Wrote {path}")

    # Chrome Web Store listing icon: 128x128, opaque PNG (no transparency).
    store_icon = Image.new("RGB", (128, 128), BG)
    store_icon.paste(draw_lock(128), (0, 0), draw_lock(128))
    store_path = STORE_DIR / "store-icon-128.png"
    store_icon.save(store_path, format="PNG")
    print(f"Wrote {store_path}")


if __name__ == "__main__":
    main()
