#!/usr/bin/env python3
"""Rebuild opaque home-screen icons from the 开口 mark.

The mark is the same 朱红喇叭 as public/favicon.svg, drawn full-bleed
(no pre-rounded corners, no transparent pixels) so iOS can mask it.

Requires the `rsvg-convert` binary and Pillow.
"""

from __future__ import annotations

import io
import shutil
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

MARK = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#c4472f"/>
  <path fill="#fff" d="M8 13h3.2L16 9.4v13.2L11.2 19H8v-6z"/>
  <path d="M19 12.2a4.2 4.2 0 0 1 0 7.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
</svg>
"""

# Canonical files, then extra names iOS still requests while adding a Web Clip.
SIZES = {
    "apple-touch-icon.png": 180,
    "apple-touch-icon-167.png": 167,
    "apple-touch-icon-152.png": 152,
    "apple-touch-icon-120.png": 120,
    "icon-192.png": 192,
    "icon-512.png": 512,
}

COPIES = {
    "apple-touch-icon-precomposed.png": "apple-touch-icon.png",
    "apple-touch-icon-180x180.png": "apple-touch-icon.png",
    "apple-touch-icon-167x167.png": "apple-touch-icon-167.png",
    "apple-touch-icon-152x152.png": "apple-touch-icon-152.png",
    "apple-touch-icon-120x120.png": "apple-touch-icon-120.png",
}


def render(size: int) -> Image.Image:
    png = subprocess.check_output(
        ["rsvg-convert", "-w", str(size), "-h", str(size), "-b", "#c4472f"],
        input=MARK.encode(),
    )
    image = Image.open(io.BytesIO(png)).convert("RGB")
    if image.size != (size, size):
        raise SystemExit(f"expected {size}x{size}, got {image.size}")
    return image


def save_png(image: Image.Image, path: Path) -> None:
    # Re-encode with libpng so the file is a plain opaque RGB PNG:
    # no alpha, no bKGD, no palette.
    image.save(path, format="PNG", optimize=True)


def main() -> None:
    written = {}
    for name, size in SIZES.items():
        path = PUBLIC / name
        save_png(render(size), path)
        written[name] = path
        print(f"{name}: {path.stat().st_size} bytes")

    for name, source in COPIES.items():
        dest = PUBLIC / name
        shutil.copyfile(written[source], dest)
        print(f"{name}: copy of {source}")

    icon32 = render(32)
    icon32.save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32)],
    )
    print(f"favicon.ico: {(PUBLIC / 'favicon.ico').stat().st_size} bytes")


if __name__ == "__main__":
    main()
