"use strict";

const listEl = document.getElementById("list");
const readerEl = document.getElementById("reader");
const searchEl = document.getElementById("search");

let briefings = [];      // [{ file, date, title, summary }]
let activeFile = null;

marked.setOptions({ gfm: true, breaks: false });

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
}

function renderList(filter = "") {
  const q = filter.trim().toLowerCase();
  const items = briefings.filter(
    (b) =>
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.date.includes(q) ||
      (b.summary || "").toLowerCase().includes(q)
  );

  if (!items.length) {
    listEl.innerHTML = `<p class="muted">No briefings${q ? " match" : " yet"}.</p>`;
    return;
  }

  listEl.innerHTML = "";
  for (const b of items) {
    const btn = document.createElement("button");
    btn.className = "item" + (b.file === activeFile ? " active" : "");
    btn.innerHTML =
      `<span class="date">${fmtDate(b.date)}</span>` +
      `<span class="title"></span>`;
    btn.querySelector(".title").textContent = b.title;
    btn.addEventListener("click", () => {
      location.hash = encodeURIComponent(b.date);
    });
    listEl.appendChild(btn);
  }
}

async function openBriefing(b) {
  activeFile = b.file;
  renderList(searchEl.value);
  readerEl.innerHTML = `<p class="muted">Loading&hellip;</p>`;
  try {
    const res = await fetch(b.file, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    const md = await res.text();
    readerEl.innerHTML =
      `<div class="meta">${fmtDate(b.date)} &middot; ${b.file}</div>` +
      marked.parse(md);
    readerEl.scrollTop = 0;
    document.title = `${b.title} — Daily Briefings`;
  } catch (err) {
    readerEl.innerHTML = `<p class="muted">Failed to load (${err.message}).</p>`;
  }
}

function routeFromHash() {
  const key = decodeURIComponent(location.hash.replace(/^#/, ""));
  const match = briefings.find((b) => b.date === key) || briefings[0];
  if (match) openBriefing(match);
}

async function init() {
  try {
    const res = await fetch("manifest.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    briefings = await res.json();
  } catch (err) {
    listEl.innerHTML = `<p class="muted">Could not load manifest.json (${err.message}).</p>`;
    return;
  }

  briefings.sort((a, b) => b.date.localeCompare(a.date));
  renderList();
  routeFromHash();
}

searchEl.addEventListener("input", () => renderList(searchEl.value));
window.addEventListener("hashchange", routeFromHash);
init();
