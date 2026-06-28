#!/usr/bin/env python3
"""Scan briefings/ and write manifest.json.

Each briefing is a markdown file named YYYY-MM-DD.md (an optional
"-slug" suffix is allowed, e.g. 2026-06-28-launch.md).

Title  = first level-1 heading ("# ...") if present, else the date.
Summary = first non-heading, non-empty line of text (used for search).
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BRIEFINGS = ROOT / "briefings"
OUT = ROOT / "manifest.json"

DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})")


def extract(md: str):
    title = None
    summary = None
    for raw in md.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("#"):
            if title is None:
                title = line.lstrip("#").strip()
            continue
        if summary is None:
            summary = re.sub(r"[*_`>#\[\]]", "", line)[:160]
        if title is not None and summary is not None:
            break
    return title, summary


def main():
    entries = []
    for path in sorted(BRIEFINGS.glob("*.md")):
        m = DATE_RE.match(path.stem)
        if not m:
            print(f"skip (no date prefix): {path.name}")
            continue
        date = m.group(1)
        title, summary = extract(path.read_text(encoding="utf-8"))
        entries.append(
            {
                "file": f"briefings/{path.name}",
                "date": date,
                "title": title or date,
                "summary": summary or "",
            }
        )

    entries.sort(key=lambda e: e["date"], reverse=True)
    OUT.write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.name} with {len(entries)} briefing(s)")


if __name__ == "__main__":
    main()
