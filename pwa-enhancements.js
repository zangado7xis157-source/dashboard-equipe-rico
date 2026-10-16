(() => {
  "use strict";

  const RICO_BUILD_VERSION = "3f7b706e50adb4d0d7c679e5cc1e796c4e1f61b4";
  const VERSION_URL = "/app-version.json";
  const POLL_MS = 30000;
  let latestVersion = RICO_BUILD_VERSION;
  let deferredInstallPrompt = null;
  let updateBanner = null;

  const isStandalone = () =>
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true;

  function injectStyles() {
    if (document.getElementById("ricoPwaStyles")) return;
    const style = document.createElement("style");
    style.id = "ricoPwaStyles";
    style.textContent = `
      #ricoUpdateBanner{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;width:min(94vw,620px);display:none;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border:1px solid rgba(19,140,255,.65);border-radius:16px;background:linear-gradient(180deg,#071629,#03101e);box-shadow:0 18px 55px rgba(0,0,0,.5),0 0 30px rgba(19,140,255,.12);color:#f4f8ff;font-family:inherit}
      #ricoUpdateBanner.show{display:flex}
      #ricoUpdateBanner .rico-update-copy{min-width:0}
      #ricoUpdateBanner .rico-update-title{font-weight:950;font-size:14px;margin-bottom:3px}
      #ricoUpdateBanner .rico-update-sub{font-size:11px;color:#8fa8c3;line-height:1.35}
      #ricoUpdateBanner .rico-update-actions{display:flex;gap:8px;flex:0 0 auto}
      #ricoUpdateBanner button{border:0;border-radius:11px;padding:10px 13px;font-weight:900;cursor:pointer}
      #ricoUpdateNow{background:linear-gradient(180deg,#158fff,#006de9);color:white}
      #ricoUpdateLater{background:#0b1a2c;color:#a8bdd2;border:1px solid rgba(100,150,205,.22)!important}
      #ricoInstallToast{position:fixed;right:18px;bottom:18px;z-index:99998;display:none;max-width:360px;padding:14px 16px;border:1px solid rgba(21,239,159,.35);border-radius:14px;background:#06151e;color:#eef8ff;box-shadow:0 16px 45px rgba(0,0,0,.42);font-family:inherit;font-size:12px;line-height:1.45}
      #ricoInstallToast.show{display:block}
      @media(max-width:620px){#ricoUpdateBanner{bottom:12px;align-items:flex-start;flex-direction:column}#ricoUpdateBanner .rico-update-actions{width:100%}#ricoUpdateBanner button{flex:1}#ricoInstallToast{left:12px;right:12px;bottom:12px;max-width:none}}
    `;
    document.head.appendChild(style);
  }

  function ensureUpdateBanner() {
    if (updateBanner) return updateBanner;
    updateBanner = document.createElement("div");
    updateBanner.id = "ricoUpdateBanner";
    updateBanner.innerHTML = `
      <div class="rico-update-copy">
        <div class="rico-update-title">🔄 Nova atualização disponível</div>
        <div class="rico-update-sub">O Dashboard Rico recebeu uma versão nova. Atualize para usar as mudanças agora.</div>
      </div>
      <div class="rico-update-actions">
        <button id="ricoUpdateLater" type="button">Depois</button>
        <button id="ricoUpdateNow" type="button">Atualizar agora</button>
      </div>`;
    document.body.appendChild(updateBanner);
    document.getElementById("ricoUpdateLater").onclick = () => updateBanner.classList.remove("show");
    document.getElementById("ricoUpdateNow").onclick = hardUpdate;
    return updateBanner;
  }

  function showUpdateBanner(version) {
    latestVersion = version || latestVersion;
    ensureUpdateBanner().classList.add("show");
  }

  async function hardUpdate() {
    const btn = document.getElementById("ricoUpdateNow");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Atualizando...";
    }
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      }
    } catch (_) {}
    const url = new URL(window.location.href);
    url.searchParams.set("rico_update", latestVersion || Date.now().toString());
    window.location.replace(url.toString());
  }

  async function fetchRemoteVersion() {
    try {
      const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      return String(data.version || "").trim() || null;
    } catch (_) {
      return null;
    }
  }

  async function checkForUpdate() {
    const remote = await fetchRemoteVersion();
    if (!remote) return;
    if (remote !== RICO_BUILD_VERSION) showUpdateBanner(remote);
  }

  function showInstallHelp() {
    let toast = document.getElementById("ricoInstallToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ricoInstallToast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<strong>Instalar Dashboard Rico</strong><br>No Chrome ou Edge, procure o ícone de instalar na barra de endereço ou abra o menu do navegador e escolha <b>Instalar Equipe Rico</b>.`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 7000);
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
      <span class="side-menu-copy"><span class="side-menu-title">Instalar no PC</span><span class="side-menu-sub">Abrir como aplicativo</span></span>`;
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
    if (isStandalone()) {
      button.querySelector(".side-menu-title").textContent = "Dashboard instalado";
      button.querySelector(".side-menu-sub").textContent = "Executando como aplicativo";
    }
  }

  function applyNoTrialCopy() {
    const badge = document.getElementById("lockBadge");
    const title = document.getElementById("lockTitle");
    const text = document.getElementById("lockText");

    if (badge && /teste gr[aá]tis/i.test(badge.textContent || "")) {
      badge.textContent = "Acesso bloqueado";
    }
    if (title && /(dispositivo|rede).*teste|utilizou o teste/i.test(title.textContent || "")) {
      title.textContent = "Ative seu Dashboard";
    }
    if (text && /teste gr[aá]tis|dispositivo\/rede/i.test(text.textContent || "")) {
      text.textContent = "Para acessar o Dashboard, faça o pagamento e use a key recebida para liberar seu acesso.";
    }

    const authMsg = document.getElementById("authMsg");
    if (authMsg && /teste gr[aá]tis/i.test(authMsg.textContent || "")) {
      authMsg.textContent = "Crie sua conta e depois ative o acesso usando uma key válida.";
    }

    const gamesBox = document.querySelector("#gamesLockedOverlay .games-lock-box p");
    if (gamesBox && /teste gr[aá]tis/i.test(gamesBox.textContent || "")) {
      gamesBox.textContent = "A lista de jogos é exclusiva para assinantes e é liberada após o pagamento e ativação de uma key válida.";
    }
  }

  function disableTrialUi() {
    try {
      window.syncTrialGuard = async () => ({
        ok: true,
        state: "blocked",
        access_status: "blocked",
        trial_enabled: false
      });
    } catch (_) {}

    applyNoTrialCopy();

    const observer = new MutationObserver(() => applyNoTrialCopy());
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true
    });

    document.addEventListener("click", (event) => {
      if (event.target?.id === "signupTab" || event.target?.closest?.("#signupTab")) {
        setTimeout(applyNoTrialCopy, 0);
      }
    }, true);
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    ensureInstallMenuItem();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    const item = document.getElementById("sideInstallItem");
    if (item) {
      item.querySelector(".side-menu-title").textContent = "Dashboard instalado";
      item.querySelector(".side-menu-sub").textContent = "Executando como aplicativo";
    }
  });

  function cleanUpdateQuery() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("rico_update")) return;
    url.searchParams.delete("rico_update");
    history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
  }

  function boot() {
    injectStyles();
    ensureInstallMenuItem();
    cleanUpdateQuery();
    disableTrialUi();
    setTimeout(checkForUpdate, 2500);
    setInterval(checkForUpdate, POLL_MS);
    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) checkForUpdate();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
