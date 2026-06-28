---
title: Daily Briefing Routine
schedule: Every day at 07:00 (Europe/Vilnius)
output: briefings/YYYY-MM-DD.md
---

# Daily Briefing — Routine Prompt

This is the exact prompt the daily Claude routine runs. It is the single
source of truth: the routine reads this file, and the **Settings** page renders
this same file — so what you see is always what runs.

## Pipeline

1. **Fetch** — Pull fresh data from the configured APIs (news, calendar, weather, repos, etc.).
2. **Search** — Run web searches for the day's relevant topics and gather sources.
3. **Analyze** — Synthesize the fetched data and search results into the few things that actually matter today.
4. **Format** — Write a short markdown briefing: a `# Title`, then 3–6 tight bullets and a brief outlook.
5. **Commit** — Save it as `briefings/YYYY-MM-DD.md`, then commit and push to `main`.

## Full prompt

You are writing today's entry for a personal daily-briefing feed.

**Task**

1. **Fetch** the latest from my configured sources via their APIs. Pull only
   what changed in the last ~24h. Keep raw data out of the final briefing.
2. **Search** the web for context on anything time-sensitive that came up in
   step 1, and for 1–2 broader topics I track. Prefer primary sources; capture
   links.
3. **Analyze**: from everything gathered, pick the handful of items that are
   genuinely worth my attention today. Cut the rest. Be opinionated.
4. **Format** the result as markdown:
   - Start with `# <Weekday> Briefing` (e.g. `# Monday Briefing`).
   - A one-line summary sentence.
   - A `## Headlines` section: 3–6 bullets, each one line, **bold** the lead.
   - An optional `## Notes` or `## Looking ahead` section, 2–4 lines.
   - Keep the whole thing to roughly one screen. If it doesn't fit, it's a
     report, not a briefing — cut harder.
5. **Save** the file as `briefings/<today's date as YYYY-MM-DD>.md`.
   - Do **not** edit `manifest.json` — the GitHub Action regenerates it on push.
   - Do not modify `index.html`, `settings.html`, `app.js`, `settings.js`,
     `style.css`, or this `prompt.md`.
6. **Commit** with message `briefing: <YYYY-MM-DD>` and **push** to `main`.
   Pushing triggers the deploy workflow, which rebuilds the index and publishes
   the site.

**Constraints**

- One briefing file per day. If today's file already exists, update it in place
  rather than creating a duplicate.
- No secrets or API keys in the committed output.
- Write in plain, direct language. No filler, no preamble.
