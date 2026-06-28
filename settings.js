"use strict";

const metaEl = document.getElementById("meta");
const flowEl = document.getElementById("flow");
const promptEl = document.getElementById("prompt");

marked.setOptions({ gfm: true, breaks: false });

/** Split optional YAML-ish frontmatter from the markdown body. */
function splitFrontmatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) meta[kv[1].trim()] = kv[2].trim();
  }
  return { meta, body: text.slice(m[0].length) };
}

/** Pull the ordered list under a "## Pipeline" heading into [{title, desc}]. */
function parsePipeline(body) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => /^##\s+pipeline\s*$/i.test(l.trim()));
  if (start === -1) return [];
  const steps = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,6}\s/.test(line)) break; // next heading ends the section
    const m = line.match(/^\s*\d+\.\s+(.*)$/);
    if (!m) continue;
    const item = m[1];
    const bold = item.match(/\*\*(.+?)\*\*/);
    const title = bold ? bold[1] : item.split(/[—\-:]/)[0].trim();
    const desc = item
      .replace(/\*\*(.+?)\*\*/, "")
      .replace(/^[\s—\-:]+/, "")
      .trim();
    steps.push({ title, desc });
  }
  return steps;
}

function renderMeta(meta) {
  const order = ["schedule", "output", "title"];
  const keys = [...order.filter((k) => k in meta), ...Object.keys(meta).filter((k) => !order.includes(k))];
  if (!keys.length) {
    metaEl.innerHTML = `<dt>status</dt><dd class="muted">no frontmatter</dd>`;
    return;
  }
  metaEl.innerHTML = keys
    .map((k) => `<dt>${k}</dt><dd>${escapeHtml(meta[k])}</dd>`)
    .join("");
}

function renderFlow(steps) {
  if (!steps.length) {
    flowEl.innerHTML = `<span class="muted">No "## Pipeline" section found in prompt.md.</span>`;
    return;
  }
  flowEl.innerHTML = "";
  steps.forEach((s, i) => {
    if (i) {
      const arrow = document.createElement("span");
      arrow.className = "flow-arrow";
      arrow.textContent = "→";
      flowEl.appendChild(arrow);
    }
    const step = document.createElement("div");
    step.className = "step";
    step.innerHTML =
      `<span class="step-n">${i + 1}</span>` +
      `<span class="step-title"></span>` +
      `<span class="step-desc"></span>`;
    step.querySelector(".step-title").textContent = s.title;
    step.querySelector(".step-desc").textContent = s.desc;
    flowEl.appendChild(step);
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

async function init() {
  let text;
  try {
    const res = await fetch("prompt.md", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    text = await res.text();
  } catch (err) {
    const msg = `<span class="muted">Could not load prompt.md (${err.message}).</span>`;
    metaEl.innerHTML = `<dt>status</dt><dd class="muted">error</dd>`;
    flowEl.innerHTML = msg;
    promptEl.innerHTML = msg;
    return;
  }

  const { meta, body } = splitFrontmatter(text);
  renderMeta(meta);
  renderFlow(parsePipeline(body));
  promptEl.innerHTML = marked.parse(body);
}

init();
