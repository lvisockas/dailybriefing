/* Daily Briefings — service worker */
"use strict";

const VERSION = "v1";
const SHELL = "db-shell-" + VERSION;
const META = "db-meta";

const SHELL_ASSETS = [
  "./index.html",
  "./settings.html",
  "./style.css",
  "./app.js",
  "./settings.js",
  "./pwa.js",
  "./app.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL && k !== META).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Network-first for the feed data (always want today's briefing), cache-first
   for the static shell. */
function isDynamic(url) {
  return url.pathname.endsWith("/manifest.json") || url.pathname.includes("/briefings/");
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let CDN (marked) pass through

  if (isDynamic(url)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          caches.open(SHELL).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

/* ---- last-notified bookkeeping (stored as a Response in the META cache) ---- */
async function getLastNotified() {
  const c = await caches.open(META);
  const r = await c.match("meta:last-notified");
  return r ? (await r.text()) : null;
}
async function setLastNotified(date) {
  const c = await caches.open(META);
  await c.put("meta:last-notified", new Response(date));
}

async function checkForNewBriefing() {
  const res = await fetch("manifest.json", { cache: "no-store" });
  if (!res.ok) return;
  const list = await res.json();
  if (!Array.isArray(list) || !list.length) return;
  list.sort((a, b) => b.date.localeCompare(a.date));
  const latest = list[0];
  const last = await getLastNotified();
  if (latest.date === last) return; // already announced
  await setLastNotified(latest.date);
  await self.registration.showNotification("Naujas briefingas", {
    body: latest.title || latest.date,
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: "daily-briefing-" + latest.date,
    data: { url: "./index.html#" + encodeURIComponent(latest.date) },
  });
}

/* Periodic Background Sync (installed PWA, Chromium): wakes ~daily. */
self.addEventListener("periodicsync", (e) => {
  if (e.tag === "daily-briefing") e.waitUntil(checkForNewBriefing());
});

/* Server-sent Web Push (used only if a push backend is wired up later). */
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { body: e.data && e.data.text() }; }
  e.waitUntil(
    self.registration.showNotification(data.title || "Naujas briefingas", {
      body: data.body || "",
      icon: "icon-192.png",
      badge: "icon-192.png",
      data: { url: data.url || "./index.html" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "./index.html";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        if ("focus" in c) { c.navigate(target).catch(() => {}); return c.focus(); }
      }
      return self.clients.openWindow(target);
    })
  );
});

/* Let the page trigger a manual check ("Check now"). */
self.addEventListener("message", (e) => {
  if (e.data === "check-briefing") e.waitUntil(checkForNewBriefing());
});
