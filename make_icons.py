#!/usr/bin/env python3
"""Generate PWA icons with no third-party deps (pure stdlib PNG writer).

Design: full-bleed Claude-coral background with a centered cream rounded
square (the "filled square" brand mark). Full-bleed so it doubles as a
maskable icon. Run: python3 make_icons.py
"""

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent

CORAL = (201, 100, 66)   # #C96442
CREAM = (240, 238, 230)  # #F0EEE6


def rounded_square_contains(x, y, cx, cy, half, radius):
    dx, dy = abs(x - cx), abs(y - cy)
    if dx > half or dy > half:
        return False
    if dx <= half - radius or dy <= half - radius:
        return True
    ex, ey = dx - (half - radius), dy - (half - radius)
    return ex * ex + ey * ey <= radius * radius


def make_png(path, size, *, mark_ratio=0.46, ss=3):
    """Render at ss× then box-downsample for cheap anti-aliasing."""
    big = size * ss
    cx = cy = (big - 1) / 2
    half = big * mark_ratio / 2
    radius = half * 0.30

    # supersampled RGB buffer
    buf = bytearray(big * big * 3)
    for y in range(big):
        row = y * big * 3
        for x in range(big):
            r, g, b = CREAM if rounded_square_contains(x, y, cx, cy, half, radius) else CORAL
            i = row + x * 3
            buf[i], buf[i + 1], buf[i + 2] = r, g, b

    # downsample ss×ss -> 1
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter: none
        for x in range(size):
            tr = tg = tb = 0
            for oy in range(ss):
                base = ((y * ss + oy) * big + x * ss) * 3
                for ox in range(ss):
                    j = base + ox * 3
                    tr += buf[j]; tg += buf[j + 1]; tb += buf[j + 2]
            n = ss * ss
            raw += bytes((tr // n, tg // n, tb // n))

    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data
                + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    idat = zlib.compress(bytes(raw), 9)
    path.write_bytes(b"\x89PNG\r\n\x1a\n"
                     + chunk(b"IHDR", ihdr)
                     + chunk(b"IDAT", idat)
                     + chunk(b"IEND", b""))
    print(f"wrote {path.name} ({size}x{size})")


if __name__ == "__main__":
    make_png(ROOT / "icon-192.png", 192)
    make_png(ROOT / "icon-512.png", 512)
    make_png(ROOT / "apple-touch-icon.png", 180)
