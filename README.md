# Daily Briefings

A tiny static feed of daily briefings. Plain markdown files, a wireframe-ish
reader UI, hosted on GitHub Pages. No build tooling, no framework.

**Live site:** https://lvisockas.github.io/dailybriefing/

## Add a briefing

1. Create a file in `briefings/` named by date: `YYYY-MM-DD.md`
   (an optional slug is fine too, e.g. `2026-06-28-launch.md`).
2. Write markdown. The first `# Heading` becomes the title.
3. Commit and push to `main`.

That's it — the GitHub Action rebuilds `manifest.json` and redeploys.

```bash
echo "# Monday Briefing\n\nHello." > briefings/2026-06-29.md
git add briefings/2026-06-29.md
git commit -m "briefing: 2026-06-29"
git push
```

## How it works

| File                  | Role                                                        |
| --------------------- | ----------------------------------------------------------- |
| `index.html`          | Page shell: top bar, list, reader pane.                     |
| `style.css`           | Clean, Claude-inspired sans-serif styling.                  |
| `app.js`              | Loads `manifest.json`, renders the feed and reader.         |
| `settings.html` / `settings.js` | Settings page: PWA controls + routine flow + live prompt. |
| `prompt.md`           | The exact prompt the daily routine runs (source of truth).  |
| `briefings/*.md`      | One markdown file per briefing.                             |
| `manifest.json`       | Generated index of briefings (date, title, summary).        |
| `generate_manifest.py`| Rebuilds `manifest.json` by scanning `briefings/`.          |
| `app.webmanifest`     | PWA manifest (installable app metadata + icons).            |
| `sw.js`               | Service worker: offline cache, push + periodic-sync checks. |
| `pwa.js`              | SW registration + install / notification controls.          |
| `icon-*.png` / `make_icons.py` | App icons and the dependency-free generator.       |
| `.github/workflows/`  | Rebuilds the manifest and deploys to Pages on every push.   |

Markdown is rendered client-side with [marked](https://marked.js.org/) from a CDN.

## Install & notifications (PWA)

The site is an installable PWA. From the **Settings** page you can **add it to the
home screen** and **enable notifications** — you then get a notification when a new
briefing is published.

Because GitHub Pages is static (no backend), notifications use **Periodic
Background Sync**: an *installed* PWA wakes ~daily, fetches `manifest.json`, and
notifies on a new entry. This works on **Chromium (Android/desktop)** once
installed; the app also checks on open. On **iOS/Safari**, periodic sync isn't
available, so guaranteed scheduled push there would need a real Web Push backend
(VAPID + a server to send pushes) — `sw.js` already has a `push` handler ready if
you wire one up.

## The daily routine

A scheduled Claude routine writes a new briefing each day. Its instructions live
in [`prompt.md`](prompt.md) — that single file is the source of truth:

- The routine **runs** `prompt.md`.
- The [**Settings** page](https://lvisockas.github.io/dailybriefing/settings.html)
  **fetches and renders** the same `prompt.md` at load time, and auto-generates
  the **Flow** diagram from its `## Pipeline` steps.

So the flow and prompt shown on the site can never drift from what actually runs —
edit `prompt.md`, push, and both the routine and the Settings page update together.

## Run locally

The page fetches files, so use a local server (not `file://`):

```bash
python3 generate_manifest.py   # after adding/removing briefings
python3 -m http.server 8000
# open http://localhost:8000
```

## One-time setup

In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions.**
