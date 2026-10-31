(() => {
  "use strict";

  const BILLING_API = "https://rico-browser-android-pago.onrender.com";
  const STORAGE_TOKEN = "rico_dashboard_billing_token";
  const STORAGE_PLAN = "rico_dashboard_billing_plan";
  const STORAGE_CHECKOUT = "rico_dashboard_billing_checkout";
  const PLANS = {
    monthly: { label: "Mensal", price: 29.99, note: "30 dias de acesso" },
    lifetime: { label: "Vitalício", price: 79.99, note: "pagamento único" },
  };

  let selectedPlan = "monthly";
  let polling = false;
  let pollTimer = null;

  const money = (value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function getUserId() {
    try {
      return typeof user !== "undefined" && user && user.id ? user.id : null;
    } catch (_) {
      return null;
    }
  }

  function injectStyles() {
    if (document.getElementById("ricoBillingStyles")) return;
    const style = document.createElement("style");
    style.id = "ricoBillingStyles";
    style.textContent = `
      .rico-billing-panel{margin-top:16px;border:1px solid rgba(255,255,255,.13);border-radius:20px;background:linear-gradient(180deg,#0e1114 0%,#090b0d 100%);padding:18px;text-align:left;box-shadow:0 18px 55px rgba(0,0,0,.28)}
      .rico-billing-kicker{font-size:10px;font-weight:950;letter-spacing:.16em;text-transform:uppercase;color:#9aa2ad;margin-bottom:5px}
      .rico-billing-title{font-size:20px;font-weight:950;color:#fff;line-height:1.15;margin-bottom:4px}
      .rico-billing-sub{font-size:12px;line-height:1.5;color:#9fa6b1;margin-bottom:15px}
      .rico-plan-list{display:grid;gap:9px}
      .rico-plan{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;border-radius:14px;border:1px solid #30353d;background:#0b0d10;color:#fff;cursor:pointer;text-align:left;transition:border-color .15s ease,transform .15s ease,background .15s ease}
      .rico-plan:hover{transform:translateY(-1px);border-color:#555c68}
      .rico-plan.selected{border-color:#f4f4f5;box-shadow:0 0 0 1px #f4f4f5 inset;background:#12151a}
      .rico-plan-left{display:flex;align-items:center;gap:11px;min-width:0}
      .rico-radio{width:18px;height:18px;border-radius:999px;border:2px solid #59606b;display:grid;place-items:center;flex:0 0 auto}
      .rico-plan.selected .rico-radio{border-color:#fff}
      .rico-plan.selected .rico-radio:after{content:"";width:8px;height:8px;border-radius:50%;background:#fff}
      .rico-plan-name{font-size:14px;font-weight:900}
      .rico-plan-note{font-size:11px;color:#8f97a3;margin-top:2px}
      .rico-plan-price{font-size:15px;font-weight:950;white-space:nowrap}
      .rico-plan-badge{display:inline-block;margin-left:6px;border-radius:999px;border:1px solid #4a505a;padding:3px 6px;font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#d9dce1;vertical-align:2px}
      .rico-billing-summary{margin-top:12px;border:1px solid #292e35;border-radius:13px;padding:12px;background:#080a0c;display:flex;align-items:center;justify-content:space-between;gap:10px}
      .rico-billing-summary span{font-size:11px;color:#939ba6}.rico-billing-summary strong{font-size:18px;color:#fff}
      .rico-generate-pix{width:100%;margin-top:11px;border:0;border-radius:13px;padding:14px 16px;background:#fff;color:#050607;font:inherit;font-weight:950;cursor:pointer}
      .rico-generate-pix:disabled{opacity:.55;cursor:wait}
      .rico-billing-secure{text-align:center;color:#777f8a;font-size:10px;margin-top:9px;line-height:1.4}
      .rico-billing-status{display:none;margin-top:12px;border-radius:13px;padding:12px;border:1px solid #30353d;background:#0b0d10;color:#c5cad1;font-size:12px;line-height:1.5}
      .rico-billing-status.show{display:block}.rico-billing-status.success{border-color:#245c36;background:#08160e;color:#8af0a8}.rico-billing-status.error{border-color:#6b2630;background:#1a090c;color:#ff929d}
      .rico-billing-actions{display:none;grid-template-columns:1fr;gap:8px;margin-top:9px}.rico-billing-actions.show{display:grid}
      .rico-check-payment,.rico-open-payment,.rico-manual-key{width:100%;border-radius:12px;padding:12px 13px;font:inherit;font-weight:900;cursor:pointer;text-decoration:none;text-align:center;box-sizing:border-box}
      .rico-check-payment{border:0;background:#f2f3f5;color:#08090a}.rico-open-payment,.rico-manual-key{border:1px solid #363c45;background:#12151a;color:#fff}
      .rico-manual-key{margin-top:10px}
      #paymentBtn.rico-old-payment-hidden{display:none!important}
      .rico-billing-return{margin-top:8px;text-align:center;font-size:10px;color:#7f8791}
      @media(max-width:520px){.rico-billing-panel{padding:15px}.rico-plan{padding:12px}.rico-plan-price{font-size:14px}}
    `;
    document.head.appendChild(style);
  }

  function panelHtml() {
    return `
      <div class="rico-billing-kicker">PAGAMENTO DO DASHBOARD</div>
      <div class="rico-billing-title">Escolha seu plano</div>
      <div class="rico-billing-sub">O PIX é gerado em um checkout seguro. Assim que o pagamento for confirmado, seu acesso é liberado automaticamente.</div>
      <div class="rico-plan-list">
        <button class="rico-plan selected" type="button" data-plan="monthly">
          <div class="rico-plan-left"><span class="rico-radio"></span><div><div class="rico-plan-name">Mensal</div><div class="rico-plan-note">30 dias de acesso</div></div></div>
          <div class="rico-plan-price">R$ 29,99</div>
        </button>
        <button class="rico-plan" type="button" data-plan="lifetime">
          <div class="rico-plan-left"><span class="rico-radio"></span><div><div class="rico-plan-name">Vitalício <span class="rico-plan-badge">melhor opção</span></div><div class="rico-plan-note">Pagamento único, sem renovação</div></div></div>
          <div class="rico-plan-price">R$ 79,99</div>
        </button>
      </div>
      <div class="rico-billing-summary"><span>Total a pagar</span><strong id="ricoBillingTotal">R$ 29,99</strong></div>
      <button class="rico-generate-pix" id="ricoGeneratePix" type="button">⚡ Gerar PIX — R$ 29,99</button>
      <div class="rico-billing-secure">PIX via Asaas • confirmação automática • acesso liberado após aprovação</div>
      <div class="rico-billing-status" id="ricoBillingStatus"></div>
      <div class="rico-billing-actions" id="ricoBillingActions">
        <button class="rico-check-payment" id="ricoCheckPayment" type="button">Verificar pagamento agora</button>
        <a class="rico-open-payment" id="ricoOpenPayment" href="#" target="_blank" rel="noopener noreferrer">Abrir tela do PIX novamente</a>
      </div>
      <button class="rico-manual-key" id="ricoManualKey" type="button">Já tenho uma key</button>
      <div class="rico-billing-return">Mensal adiciona 30 dias. O plano vitalício não vence.</div>`;
  }

  function setStatus(message, type = "") {
    const box = document.getElementById("ricoBillingStatus");
    if (!box) return;
    box.textContent = message;
    box.className = `rico-billing-status show${type ? ` ${type}` : ""}`;
  }

  function setActions(show) {
    document.getElementById("ricoBillingActions")?.classList.toggle("show", Boolean(show));
  }

  function selectPlan(plan) {
    if (!PLANS[plan]) return;
    selectedPlan = plan;
    document.querySelectorAll(".rico-plan[data-plan]").forEach((button) => {
      button.classList.toggle("selected", button.dataset.plan === plan);
    });
    const price = money(PLANS[plan].price);
    const total = document.getElementById("ricoBillingTotal");
    const generate = document.getElementById("ricoGeneratePix");
    if (total) total.textContent = price;
    if (generate) generate.textContent = `⚡ Gerar PIX — ${price}`;
  }

  function revealManualKey() {
    const paidArea = document.getElementById("paidArea");
    if (paidArea) {
      paidArea.style.display = "block";
      paidArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function saveCheckout(data) {
    localStorage.setItem(STORAGE_TOKEN, data.billingToken);
    localStorage.setItem(STORAGE_PLAN, data.plan);
    localStorage.setItem(STORAGE_CHECKOUT, data.checkoutId);
  }

  function clearCheckout() {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_PLAN);
    localStorage.removeItem(STORAGE_CHECKOUT);
  }

  async function refreshAccessAfterPayment(plan) {
    setStatus(plan === "lifetime" ? "Pagamento confirmado ✓ Acesso vitalício liberado automaticamente." : "Pagamento confirmado ✓ Acesso liberado por 30 dias.", "success");
    setActions(false);
    clearCheckout();
    try {
      if (typeof checkAccess === "function") {
        await checkAccess();
      } else {
        setTimeout(() => window.location.reload(), 900);
      }
    } catch (_) {
      setTimeout(() => window.location.reload(), 900);
    }
  }

  async function verifyPayment({ silent = false } = {}) {
    const billingToken = localStorage.getItem(STORAGE_TOKEN);
    if (!billingToken) {
      if (!silent) setStatus("Nenhum PIX pendente foi encontrado neste navegador.", "error");
      return false;
    }

    try {
      if (!silent) setStatus("Conferindo pagamento...");
      const response = await fetch(`${BILLING_API}/api/dashboard/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ billingToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível verificar o pagamento.");

      if (data.paid && data.activated) {
        await refreshAccessAfterPayment(data.plan || localStorage.getItem(STORAGE_PLAN) || "monthly");
        return true;
      }

      setStatus("Aguardando confirmação do PIX. Assim que o pagamento for aprovado, o acesso será liberado automaticamente.");
      setActions(true);
      return false;
    } catch (error) {
      if (!silent) setStatus(error.message || "Falha ao verificar o pagamento.", "error");
      return false;
    }
  }

  function startPolling() {
    if (polling) return;
    polling = true;
    let attempts = 0;
    const tick = async () => {
      if (!localStorage.getItem(STORAGE_TOKEN)) {
        polling = false;
        return;
      }
      attempts += 1;
      const done = await verifyPayment({ silent: attempts % 3 !== 1 });
      if (done || attempts >= 180) {
        polling = false;
        return;
      }
      pollTimer = setTimeout(tick, 5000);
    };
    tick();
  }

  async function generatePix() {
    const userId = getUserId();
    if (!userId) {
      setStatus("Entre na sua conta do Dashboard antes de gerar o PIX.", "error");
      return;
    }

    const button = document.getElementById("ricoGeneratePix");
    const paymentWindow = window.open("about:blank", "ricoDashboardPix");
    if (button) button.disabled = true;
    setStatus("Gerando seu PIX seguro...");
    setActions(false);

    try {
      const response = await fetch(`${BILLING_API}/api/dashboard/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, plan: selectedPlan }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar o PIX agora.");

      saveCheckout(data);
      const openLink = document.getElementById("ricoOpenPayment");
      if (openLink) openLink.href = data.checkoutUrl;

      if (paymentWindow) {
        paymentWindow.location.replace(data.checkoutUrl);
      } else {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
      }

      setStatus("PIX gerado ✓ Conclua o pagamento na aba aberta. Esta tela vai conferir a aprovação automaticamente.");
      setActions(true);
      startPolling();
    } catch (error) {
      try { paymentWindow?.close(); } catch (_) {}
      setStatus(error.message || "Não foi possível gerar o PIX.", "error");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function wirePanel(panel) {
    panel.querySelectorAll(".rico-plan[data-plan]").forEach((button) => {
      button.addEventListener("click", () => selectPlan(button.dataset.plan));
    });
    panel.querySelector("#ricoGeneratePix")?.addEventListener("click", generatePix);
    panel.querySelector("#ricoCheckPayment")?.addEventListener("click", () => verifyPayment());
    panel.querySelector("#ricoManualKey")?.addEventListener("click", revealManualKey);
    selectPlan(localStorage.getItem(STORAGE_PLAN) || "monthly");
  }

  function installPanel() {
    const paymentBtn = document.getElementById("paymentBtn");
    if (!paymentBtn || document.getElementById("ricoBillingPanel")) return;

    paymentBtn.classList.add("rico-old-payment-hidden");
    paymentBtn.removeAttribute("target");
    paymentBtn.href = "#";

    const panel = document.createElement("div");
    panel.id = "ricoBillingPanel";
    panel.className = "rico-billing-panel";
    panel.innerHTML = panelHtml();
    paymentBtn.insertAdjacentElement("afterend", panel);
    wirePanel(panel);

    if (localStorage.getItem(STORAGE_TOKEN)) {
      setStatus("Pagamento pendente encontrado. Conferindo automaticamente...");
      setActions(true);
      startPolling();
    }
  }

  function redirectLegacyPaymentLinks() {
    const handle = (event, plan = "monthly") => {
      event.preventDefault();
      selectPlan(plan);
      try {
        if (typeof showPaywall === "function") showPaywall();
      } catch (_) {}
      setTimeout(() => document.getElementById("ricoBillingPanel")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    };

    document.querySelectorAll(".monthly-payment-btn,.games-payment-link").forEach((link) => {
      if (link.dataset.ricoBillingWired === "1") return;
      link.dataset.ricoBillingWired = "1";
      link.removeAttribute("target");
      link.href = "#";
      link.addEventListener("click", (event) => handle(event, "monthly"));
    });
  }

  function handleReturnQuery() {
    const url = new URL(window.location.href);
    const state = url.searchParams.get("billing");
    if (!state) return;
    url.searchParams.delete("billing");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
    if (state === "return" && localStorage.getItem(STORAGE_TOKEN)) {
      setTimeout(() => {
        installPanel();
        setStatus("Pagamento concluído. Confirmando a aprovação...");
        startPolling();
      }, 400);
    }
  }

  function boot() {
    injectStyles();
    installPanel();
    redirectLegacyPaymentLinks();
    handleReturnQuery();

    const observer = new MutationObserver(() => {
      installPanel();
      redirectLegacyPaymentLinks();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("focus", () => {
      if (localStorage.getItem(STORAGE_TOKEN)) verifyPayment({ silent: true });
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && localStorage.getItem(STORAGE_TOKEN)) verifyPayment({ silent: true });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
