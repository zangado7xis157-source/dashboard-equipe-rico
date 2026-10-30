(() => {
  "use strict";

  const PIX_CODE = "00020126580014BR.GOV.BCB.PIX01363b9328f7-c182-4c35-b30e-dd8c21d68d1c520400005303986540579.995802BR592569.686.828 RAY FERNANDES 6009SAO PAULO61080540900062250521B38gz3pxvONgvIl1p9z3e6304F7D7";
  const WHATSAPP_URL = "https://wa.me/5535910238277?text=ja%20paguei%20o%20acesso%20vitalicio%20de%20R%24%2079%2C99%20e%20quero%20minha%20key%20vitalicia%20do%20dashboard";

  function injectStyles() {
    if (document.getElementById("ricoLifetimePaymentStyles")) return;
    const style = document.createElement("style");
    style.id = "ricoLifetimePaymentStyles";
    style.textContent = `
      .rico-lifetime-wrap{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.12)}
      .rico-lifetime-or{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8f96a3;text-align:center;margin:0 0 12px}
      .rico-lifetime-card{border:1px solid #343840;border-radius:16px;padding:16px;background:linear-gradient(180deg,#0d0f12 0%,#090a0c 100%);text-align:left}
      .rico-lifetime-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      .rico-lifetime-title{font-weight:900;font-size:16px;color:#fff}
      .rico-lifetime-badge{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;border:1px solid #4b515c;border-radius:999px;padding:6px 9px;color:#fff;white-space:nowrap}
      .rico-lifetime-price{font-size:28px;font-weight:950;line-height:1;color:#fff;margin:5px 0 5px}
      .rico-lifetime-price span{font-size:12px;font-weight:700;color:#9da4af}
      .rico-lifetime-desc{font-size:12px;line-height:1.5;color:#aab0ba;margin:0 0 13px}
      .rico-lifetime-btn{width:100%;border:0;border-radius:12px;padding:14px 16px;font:inherit;font-weight:900;cursor:pointer;background:#fff;color:#050607;transition:transform .15s ease,opacity .15s ease}
      .rico-lifetime-btn:hover{transform:translateY(-1px)}
      .rico-lifetime-btn:active{transform:translateY(0);opacity:.9}
      .rico-pix-modal{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.78);backdrop-filter:blur(8px)}
      .rico-pix-modal.open{display:flex}
      .rico-pix-box{width:min(430px,100%);max-height:92vh;overflow:auto;border:1px solid #343840;border-radius:20px;background:#08090b;color:#fff;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.58)}
      .rico-pix-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
      .rico-pix-head h3{font-size:20px;line-height:1.2;margin:0}
      .rico-pix-close{border:1px solid #343840;background:#111318;color:#fff;border-radius:10px;width:36px;height:36px;cursor:pointer;font-size:18px}
      .rico-pix-sub{margin:0 0 14px;color:#aab0ba;font-size:12px;line-height:1.5}
      .rico-pix-qr{width:220px;height:220px;margin:0 auto 15px;padding:10px;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:center}
      .rico-pix-qr img,.rico-pix-qr canvas{max-width:100%!important;max-height:100%!important}
      .rico-pix-label{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#9da4af;margin:0 0 7px}
      .rico-pix-code{width:100%;min-height:92px;resize:none;border:1px solid #343840;border-radius:12px;background:#0d0f12;color:#e8e9ec;padding:11px;font:11px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;box-sizing:border-box}
      .rico-pix-actions{display:grid;grid-template-columns:1fr;gap:9px;margin-top:10px}
      .rico-pix-copy,.rico-pix-whatsapp{border-radius:12px;padding:13px 14px;font:inherit;font-weight:900;text-align:center;text-decoration:none;cursor:pointer}
      .rico-pix-copy{border:0;background:#fff;color:#050607}
      .rico-pix-whatsapp{border:1px solid #343840;background:#111318;color:#fff}
      .rico-pix-note{margin:11px 0 0;color:#8f96a3;font-size:11px;line-height:1.45;text-align:center}
      @media (max-width:520px){.rico-lifetime-top{display:block}.rico-lifetime-badge{display:inline-block;margin-top:8px}.rico-pix-box{padding:16px}.rico-pix-qr{width:190px;height:190px}}
    `;
    document.head.appendChild(style);
  }

  function loadQRCodeLibrary() {
    return new Promise((resolve, reject) => {
      if (window.QRCode) return resolve();
      const existing = document.getElementById("ricoQRCodeLib");
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.id = "ricoQRCodeLib";
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function markPaymentStarted() {
    try {
      const uid = window.user?.id;
      const key = uid ? `payment_started_${uid}` : "payment_started";
      localStorage.setItem(key, "1");
      const paidArea = document.getElementById("paidArea");
      if (paidArea) paidArea.style.display = "block";
    } catch (_) {}
  }

  function openPixModal() {
    const modal = document.getElementById("ricoPixModal");
    if (!modal) return;
    markPaymentStarted();
    modal.classList.add("open");
    document.body.style.overflow = "hidden";

    const qr = document.getElementById("ricoPixQr");
    if (!qr || qr.dataset.ready === "1") return;
    qr.dataset.ready = "1";
    qr.innerHTML = '<span style="color:#111;font-size:12px">Gerando QR Code...</span>';
    loadQRCodeLibrary().then(() => {
      qr.innerHTML = "";
      new QRCode(qr, {
        text: PIX_CODE,
        width: 200,
        height: 200,
        correctLevel: QRCode.CorrectLevel.M,
      });
    }).catch(() => {
      qr.innerHTML = '<span style="color:#111;font-size:12px;text-align:center;line-height:1.4">Não foi possível carregar o QR Code.<br>Use o Pix Copia e Cola abaixo.</span>';
    });
  }

  function closePixModal() {
    document.getElementById("ricoPixModal")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  async function copyPix() {
    const button = document.getElementById("ricoCopyPixBtn");
    try {
      await navigator.clipboard.writeText(PIX_CODE);
    } catch (_) {
      const field = document.getElementById("ricoPixCode");
      if (field) {
        field.focus();
        field.select();
        document.execCommand("copy");
      }
    }
    if (button) {
      const original = button.textContent;
      button.textContent = "Pix copiado ✓";
      setTimeout(() => { button.textContent = original; }, 1800);
    }
  }

  function createModal() {
    if (document.getElementById("ricoPixModal")) return;
    const modal = document.createElement("div");
    modal.id = "ricoPixModal";
    modal.className = "rico-pix-modal";
    modal.innerHTML = `
      <div class="rico-pix-box" role="dialog" aria-modal="true" aria-labelledby="ricoPixTitle">
        <div class="rico-pix-head">
          <div>
            <h3 id="ricoPixTitle">Acesso Vitalício — R$ 79,99</h3>
          </div>
          <button class="rico-pix-close" id="ricoPixClose" type="button" aria-label="Fechar">×</button>
        </div>
        <p class="rico-pix-sub">Escaneie o QR Code ou copie o código Pix abaixo para realizar o pagamento.</p>
        <div class="rico-pix-qr" id="ricoPixQr"></div>
        <div class="rico-pix-label">Pix Copia e Cola</div>
        <textarea class="rico-pix-code" id="ricoPixCode" readonly></textarea>
        <div class="rico-pix-actions">
          <button class="rico-pix-copy" id="ricoCopyPixBtn" type="button">Copiar código Pix</button>
          <a class="rico-pix-whatsapp" href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer">Já paguei / Pedir key vitalícia</a>
        </div>
        <p class="rico-pix-note">O plano mensal de R$ 29,99 continua disponível normalmente acima.</p>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById("ricoPixCode").value = PIX_CODE;
    document.getElementById("ricoPixClose").addEventListener("click", closePixModal);
    document.getElementById("ricoCopyPixBtn").addEventListener("click", copyPix);
    modal.addEventListener("click", (event) => { if (event.target === modal) closePixModal(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closePixModal(); });
  }

  function addLifetimeOption() {
    const paymentBtn = document.getElementById("paymentBtn");
    if (!paymentBtn || document.getElementById("ricoLifetimeOption")) return;

    const wrap = document.createElement("div");
    wrap.id = "ricoLifetimeOption";
    wrap.className = "rico-lifetime-wrap";
    wrap.innerHTML = `
      <div class="rico-lifetime-or">ou</div>
      <div class="rico-lifetime-card">
        <div class="rico-lifetime-top">
          <div>
            <div class="rico-lifetime-title">Acesso Vitalício</div>
            <div class="rico-lifetime-price">R$ 79,99 <span>pagamento único</span></div>
          </div>
          <div class="rico-lifetime-badge">Vitalício</div>
        </div>
        <p class="rico-lifetime-desc">Pague uma única vez e solicite sua key de acesso vitalício ao Dashboard.</p>
        <button class="rico-lifetime-btn" id="ricoLifetimePayBtn" type="button">Pagar R$ 79,99 no Pix</button>
      </div>`;

    paymentBtn.insertAdjacentElement("afterend", wrap);
    document.getElementById("ricoLifetimePayBtn").addEventListener("click", openPixModal);
  }

  function boot() {
    injectStyles();
    createModal();
    addLifetimeOption();

    const observer = new MutationObserver(addLifetimeOption);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
