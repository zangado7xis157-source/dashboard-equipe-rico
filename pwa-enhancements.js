(() => {
  "use strict";

  const RICO_BUILD_VERSION = "ac2ad7dde85eab74789ec7907cbcbedc9def99f9";
  const VERSION_URL = "/app-version.json";
  const POLL_MS = 15000;
  let updating = false;
  let deferredInstallPrompt = null;

  const isStandalone = () =>
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true;

  function ensureMonochromeStyles() {
    if (!document.getElementById("ricoMonochromeTheme")) {
      const link = document.createElement("link");
      link.id = "ricoMonochromeTheme";
      link.rel = "stylesheet";
      link.href = `/rico-monochrome.css?v=${encodeURIComponent(RICO_BUILD_VERSION)}`;
      document.head.appendChild(link);
    }

    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute("content", "#050607");

    try {
      if (typeof ACHIEVEMENT_LEVELS !== "undefined") {
        ACHIEVEMENT_LEVELS.forEach((level) => { level.color = "#f4f4f5"; });
      }
    } catch (_) {}
  }

  async function registerFreshServiceWorker() {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });
      await reg.update();
      return reg;
    } catch (_) {
      return null;
    }
  }

  async function fetchRemoteVersion() {
    try {
      const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return String(data.version || "").trim() || null;
    } catch (_) {
      return null;
    }
  }

  async function clearOldCaches() {
    if (!("caches" in window)) return;
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (_) {}
  }

  async function forceLatest(version) {
    if (updating) return;
    updating = true;

    try {
      await clearOldCaches();
      const reg = await registerFreshServiceWorker();
      if (reg?.waiting) {
        try { reg.waiting.postMessage({ type: "SKIP_WAITING" }); } catch (_) {}
      }
    } catch (_) {}

    const url = new URL(window.location.href);
    url.searchParams.set("rico_latest", version || Date.now().toString());
    window.location.replace(url.toString());
  }

  async function checkForUpdate() {
    if (updating) return;
    const remote = await fetchRemoteVersion();
    if (!remote) return;
    if (remote !== RICO_BUILD_VERSION) {
      await forceLatest(remote);
    }
  }

  function showInstallHelp() {
    let toast = document.getElementById("ricoInstallToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ricoInstallToast";
      toast.style.cssText = [
        "position:fixed",
        "right:18px",
        "bottom:18px",
        "z-index:99998",
        "max-width:360px",
        "padding:14px 16px",
        "border:1px solid #343840",
        "border-radius:14px",
        "background:#0b0d10",
        "color:#f4f4f5",
        "box-shadow:0 16px 45px rgba(0,0,0,.42)",
        "font-family:inherit",
        "font-size:12px",
        "line-height:1.45",
      ].join(";");
      document.body.appendChild(toast);
    }
    toast.innerHTML = "<strong>Instalar Dashboard Rico</strong><br>No Chrome ou Edge, use a opção de instalar aplicativo na barra de endereço ou no menu do navegador.";
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 7000);
  }

  function ensureInstallMenuItem() {
    const nav = document.querySelector(".side-menu-nav");
    if (!nav || document.getElementById("sideInstallItem")) return;

    const button = document.createElement("button");
    button.id = "sideInstallItem";
    button.className = "side-menu-item";
    button.type = "button";
    button.innerHTML = `
      <span class="side-menu-icon">⬇️</span>
      <span class="side-menu-copy">
        <span class="side-menu-title">Instalar no PC</span>
        <span class="side-menu-sub">Abrir como aplicativo</span>
      </span>`;

    button.onclick = async () => {
      if (isStandalone() || !deferredInstallPrompt) {
        showInstallHelp();
        return;
      }
      try {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
      } catch (_) {}
      deferredInstallPrompt = null;
    };

    nav.appendChild(button);
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    ensureInstallMenuItem();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
  });

  function cleanLatestQuery() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("rico_latest")) return;
    url.searchParams.delete("rico_latest");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  async function boot() {
    ensureMonochromeStyles();
    cleanLatestQuery();
    await registerFreshServiceWorker();
    ensureInstallMenuItem();
    await checkForUpdate();
    setInterval(checkForUpdate, POLL_MS);
    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) checkForUpdate();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
