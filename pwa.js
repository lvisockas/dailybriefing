"use strict";

/* Registers the service worker on every page, and — if the Settings controls
   are present — wires up install + notification buttons.

   Notifications without a backend: we use Periodic Background Sync so an
   *installed* PWA wakes ~daily, checks manifest.json and notifies on a new
   briefing. This works on Chromium (Android/desktop) once installed. On
   iOS/Safari, periodic sync isn't available — notifications there would need a
   real Web Push backend (see README). We degrade gracefully and say so. */

let deferredPrompt = null;
let swReg = null;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    swReg = await navigator.serviceWorker.register("sw.js", { scope: "./" });
    return swReg;
  } catch (err) {
    console.warn("SW registration failed:", err);
    return null;
  }
}

/* ---------- Settings UI (only runs if the elements exist) ---------- */
function setupControls() {
  const statusEl = document.getElementById("pwa-status");
  const installBtn = document.getElementById("btn-install");
  const notifyBtn = document.getElementById("btn-enable-notify");
  const checkBtn = document.getElementById("btn-check-now");
  if (!statusEl) return; // not the settings page

  const lines = [];
  const setStatus = () => (statusEl.innerHTML = lines.join("<br>"));
  const say = (msg) => { lines.push(msg); setStatus(); };

  // install state
  if (isStandalone()) {
    say("✓ Įdiegta (veikia kaip programėlė).");
    if (installBtn) installBtn.hidden = true;
  } else if (installBtn) {
    installBtn.hidden = false;
    installBtn.disabled = true;
    installBtn.textContent = "Įdiegti programėlę";
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn && !isStandalone()) {
      installBtn.hidden = false;
      installBtn.disabled = false;
    }
  });

  window.addEventListener("appinstalled", () => {
    say("✓ Programėlė įdiegta. Įjunk pranešimus žemiau.");
    if (installBtn) installBtn.hidden = true;
  });

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.disabled = true;
      say(outcome === "accepted" ? "✓ Diegiama…" : "Diegimas atšauktas.");
    });
  }

  // notification state
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  if (perm === "granted") {
    say("✓ Pranešimai įjungti.");
    if (notifyBtn) notifyBtn.textContent = "Pranešimai įjungti";
  } else if (perm === "denied") {
    say("✗ Pranešimai užblokuoti naršyklės nustatymuose.");
  } else if (perm === "unsupported") {
    say("Ši naršyklė nepalaiko pranešimų.");
    if (notifyBtn) notifyBtn.disabled = true;
  }

  if (notifyBtn) {
    notifyBtn.addEventListener("click", async () => {
      if (!("Notification" in window)) return;
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        say("✗ Pranešimai neleisti.");
        return;
      }
      say("✓ Pranešimai įjungti.");
      notifyBtn.textContent = "Pranešimai įjungti";
      await enablePeriodicSync(say);
      // confirm with a local notification
      const reg = swReg || (await navigator.serviceWorker.ready);
      reg.showNotification("Pranešimai įjungti", {
        body: "Gausi žinutę, kai pasirodys naujas briefingas.",
        icon: "icon-192.png",
        badge: "icon-192.png",
      });
    });
  }

  if (checkBtn) {
    checkBtn.addEventListener("click", async () => {
      const reg = swReg || (await navigator.serviceWorker.ready);
      if (reg.active) reg.active.postMessage("check-briefing");
      say("Tikrinama…");
    });
  }
}

async function enablePeriodicSync(say) {
  const reg = swReg || (await navigator.serviceWorker.ready);
  if (!("periodicSync" in reg)) {
    say("ℹ︎ Periodinis tikrinimas nepalaikomas — pranešimai atsiras atidarius programėlę.");
    return;
  }
  try {
    const status = await navigator.permissions.query({ name: "periodic-background-sync" });
    if (status.state !== "granted") {
      say("ℹ︎ Įdiek programėlę, kad veiktų kasdienis tikrinimas fone.");
    }
    await reg.periodicSync.register("daily-briefing", {
      minInterval: 24 * 60 * 60 * 1000,
    });
    say("✓ Kasdienis foninis tikrinimas užregistruotas.");
  } catch (err) {
    say("ℹ︎ Foninis tikrinimas negalimas — pranešimai atsiras atidarius programėlę.");
  }
}

/* On load: register SW, and if notifications are on, ask SW to check now so a
   newly-published briefing notifies even without periodic sync. */
(async function init() {
  await registerSW();
  setupControls();
  if ("Notification" in window && Notification.permission === "granted") {
    const reg = swReg || (await navigator.serviceWorker.ready);
    if (reg && reg.active) reg.active.postMessage("check-briefing");
  }
})();
