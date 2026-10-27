const express = require('express');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 10000;
const ASAAS_API_BASE = process.env.ASAAS_API_BASE || 'https://api.asaas.com/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || '';
const PRODUCT_FILE_URL = process.env.PRODUCT_FILE_URL || '';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const PRICE = Number(process.env.PRODUCT_PRICE || '21.99');
const PRODUCT_NAME = process.env.PRODUCT_NAME || 'Extensão Rico China';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const DOWNLOAD_DB_SECRET = process.env.DOWNLOAD_DB_SECRET || '';

const TUTORIAL_URL = 'https://youtu.be/EwB7ouO_3M8?si=7pY1cByZfiI5ejdH';
const SUPPORT_URL = 'https://wa.me/5535910238277';
const paidOrders = new Map();
const consumedDownloads = new Set();
const downloadsInProgress = new Set();

function page(title, body) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#050914;color:#eef4ff;font-family:Inter,system-ui,Arial,sans-serif;min-height:100vh}.wrap{width:min(980px,92vw);margin:auto}.top{padding:28px 0}.brand{font-weight:950;letter-spacing:.12em;color:#6fa8ff}.hero{text-align:center;padding:55px 0}.badge{display:inline-block;padding:8px 13px;border-radius:999px;background:#0b1c39;border:1px solid #1d4c8c;color:#8fb9ff;font-size:13px;font-weight:800}.hero h1{font-size:clamp(40px,7vw,72px);line-height:1;margin:18px 0}.hero h1 span{color:#2e8cff}.muted{color:#a8b7d4;line-height:1.6}.price{font-size:46px;font-weight:950;margin:24px 0 8px}.btn{display:inline-block;background:#1677ff;color:#fff;text-decoration:none;padding:17px 28px;border-radius:14px;font-weight:900;border:1px solid #58a0ff;box-shadow:0 12px 36px #1677ff44}.btn.green{background:#16a34a;border-color:#5ee58b}.btn.red{background:#d92525;border-color:#ff7474}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:38px 0}.card{background:#0b1425;border:1px solid #1b3154;border-radius:18px;padding:24px;box-shadow:0 18px 55px #0005}.single{min-height:100vh;display:grid;place-items:center;padding:24px}.single .card{width:min(700px,100%)}.ok{color:#66e5a5}.warn{color:#ffd166}.error{color:#ff8f8f}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}.small{font-size:13px;color:#8192b1;margin-top:13px}footer{text-align:center;color:#6f809e;font-size:12px;padding:45px 0}@media(max-width:760px){.grid{grid-template-columns:1fr}.hero{padding-top:32px}.hero h1{font-size:43px}.price{font-size:38px}.actions{display:grid}.actions .btn{text-align:center}}
  </style></head><body>${body}</body></html>`;
}

function single(title, body) {
  return page(title, `<div class="single"><main class="card"><div class="brand">RICO CHINA</div>${body}</main></div>`);
}

function sign(value) {
  if (!DOWNLOAD_SECRET) return '';
  return crypto.createHmac('sha256', DOWNLOAD_SECRET).update(value).digest('hex');
}

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}

async function asaas(path, options = {}) {
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada');
  const headers = { accept: 'application/json', access_token: ASAAS_API_KEY, 'User-Agent': 'RicoChinaExtension/2.0', ...(options.headers || {}) };
  if (options.body) headers['content-type'] = 'application/json';
  const response = await fetch(`${ASAAS_API_BASE}${path}`, { ...options, headers, signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) {
    const err = new Error(`Asaas HTTP ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

function dbHeaders(extra = {}) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !DOWNLOAD_DB_SECRET) throw new Error('Banco de downloads não configurado');
  return { apikey: SUPABASE_PUBLISHABLE_KEY, 'x-download-secret': DOWNLOAD_DB_SECRET, ...extra };
}

async function isConsumed(orderId) {
  if (consumedDownloads.has(orderId)) return true;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/extension_downloads?order_id=eq.${encodeURIComponent(orderId)}&select=order_id&limit=1`, {
    headers: dbHeaders({ accept: 'application/json' }), signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error(`Falha ao consultar download: HTTP ${r.status}`);
  const rows = await r.json();
  const used = Array.isArray(rows) && rows.length > 0;
  if (used) consumedDownloads.add(orderId);
  return used;
}

async function claim(orderId) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/extension_downloads`, {
    method: 'POST',
    headers: dbHeaders({ 'content-type': 'application/json', accept: 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({ order_id: orderId }),
    signal: AbortSignal.timeout(8000)
  });
  if (r.status === 409) return false;
  if (!r.ok) throw new Error(`Falha ao registrar download: HTTP ${r.status}`);
  consumedDownloads.add(orderId);
  return true;
}

function paymentIsPaid(payment) {
  return !!payment && ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(payment.status);
}

async function getOrderPayment(orderId) {
  const links = await asaas(`/paymentLinks?limit=20&externalReference=${encodeURIComponent(orderId)}`);
  const link = Array.isArray(links.data) ? links.data.find(x => x.externalReference === orderId) || links.data[0] : null;
  if (!link?.id) return null;

  const payments = await asaas('/payments?limit=100&offset=0');
  const list = Array.isArray(payments.data) ? payments.data : [];
  return list.find(p => p.paymentLink === link.id) || null;
}

async function verifyWebhookPayment(paymentId) {
  if (!paymentId) return null;
  const payment = await asaas(`/payments/${encodeURIComponent(paymentId)}`);
  if (!paymentIsPaid(payment) || !payment.paymentLink) return null;
  const link = await asaas(`/paymentLinks/${encodeURIComponent(payment.paymentLink)}`);
  const orderId = String(link?.externalReference || '');
  if (!orderId.startsWith('ricoext_')) return null;
  return { orderId, payment };
}

app.get('/', (req, res) => {
  const price = PRICE.toFixed(2).replace('.', ',');
  res.send(page(PRODUCT_NAME, `<header class="top"><div class="wrap"><div class="brand">RICO CHINA</div></div></header><main class="wrap"><section class="hero"><div class="badge">EXTENSÃO PARA CHROME</div><h1>Rico China <span>Speed</span></h1><p class="muted">Pagamento pelo Asaas e liberação automática do arquivo após a confirmação.</p><div class="price">R$ ${price}</div><a class="btn" href="/checkout">Comprar agora</a></section><section class="grid"><article class="card"><h3>⚡ Liberação automática</h3><p class="muted">O sistema consulta o Asaas e só libera após pagamento confirmado.</p></article><article class="card"><h3>🔒 Download individual</h3><p class="muted">Cada pedido recebe um link assinado e o download é registrado.</p></article><article class="card"><h3>📦 Arquivo ZIP</h3><p class="muted">Depois da aprovação, baixe o SHEED_Rico_China.zip diretamente.</p></article></section></main><footer class="wrap">18+ · Produto digital · Sem garantia de resultados financeiros.</footer>`));
});

app.get('/health', async (req, res) => {
  let asaasReady = false;
  let asaasError = null;
  try {
    if (ASAAS_API_KEY) {
      await asaas('/payments?limit=1&offset=0');
      asaasReady = true;
    }
  } catch (e) { asaasError = String(e.message || e); }
  res.json({
    ok: true,
    service: 'rico-china-extension-delivery-v2',
    asaasReady,
    asaasError,
    productReady: !!PRODUCT_FILE_URL,
    persistentDownloads: !!SUPABASE_URL && !!SUPABASE_PUBLISHABLE_KEY && !!DOWNLOAD_DB_SECRET,
    publicBaseReady: !!PUBLIC_BASE_URL,
    downloadSecretReady: !!DOWNLOAD_SECRET
  });
});

app.get('/checkout', async (req, res) => {
  try {
    if (!PUBLIC_BASE_URL) throw new Error('PUBLIC_BASE_URL não configurada');
    if (!DOWNLOAD_SECRET) throw new Error('DOWNLOAD_SECRET não configurada');

    const orderId = `ricoext_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const successUrl = `${PUBLIC_BASE_URL}/sucesso?order=${encodeURIComponent(orderId)}&sig=${sign(orderId)}`;

    const link = await asaas('/paymentLinks', {
      method: 'POST',
      body: JSON.stringify({
        name: `${PRODUCT_NAME} - ${orderId.slice(-8)}`,
        description: 'Aceleração de Slot para CPA Chinês',
        value: PRICE,
        billingType: 'UNDEFINED',
        chargeType: 'DETACHED',
        dueDateLimitDays: 1,
        externalReference: orderId,
        notificationEnabled: true,
        callback: { successUrl, autoRedirect: true }
      })
    });

    if (!link.url) throw new Error('O Asaas não retornou a URL do pagamento');
    res.redirect(302, link.url);
  } catch (e) {
    console.error('checkout_error', e.data || e.message);
    res.status(500).send(single('Erro no pagamento', `<h1 class="error">Não consegui abrir o checkout</h1><p class="muted">Tente novamente em instantes.</p>`));
  }
});

app.get('/sucesso', async (req, res) => {
  const orderId = String(req.query.order || '');
  const sig = String(req.query.sig || '');
  if (!safeEqual(sign(orderId), sig)) return res.status(403).send(single('Link inválido', `<h1 class="error">Link inválido</h1>`));

  try {
    let paid = paidOrders.get(orderId) === true;
    if (!paid) {
      const payment = await getOrderPayment(orderId);
      paid = paymentIsPaid(payment);
      if (paid) paidOrders.set(orderId, true);
    }

    if (!paid) {
      return res.status(202).send(single('Aguardando pagamento', `<h1 class="warn">Pagamento em confirmação</h1><p class="muted">Assim que o Asaas confirmar, o download será liberado.</p><a class="btn" href="${req.originalUrl}">Verificar novamente</a>`));
    }

    if (await isConsumed(orderId)) {
      return res.status(410).send(single('Download utilizado', `<h1 class="error">Download já utilizado</h1><p class="muted">Este pedido já teve o arquivo baixado.</p><div class="actions"><a class="btn green" href="${SUPPORT_URL}" target="_blank">Falar com suporte</a></div>`));
    }

    const dlSig = sign(`download:${orderId}`);
    res.send(single('Pagamento confirmado', `<h1 class="ok">Pagamento confirmado ✓</h1><p class="muted">Seu acesso foi liberado automaticamente.</p><div class="actions"><a class="btn" href="/download?order=${encodeURIComponent(orderId)}&sig=${dlSig}">⬇️ Baixar SHEED_Rico_China.zip</a><a class="btn red" href="${TUTORIAL_URL}" target="_blank">▶ Ver tutorial</a><a class="btn green" href="${SUPPORT_URL}" target="_blank">💬 Suporte</a></div><p class="small">O pagamento é verificado diretamente na API do Asaas antes da entrega.</p>`));
  } catch (e) {
    console.error('success_check_error', e.data || e.message);
    res.status(500).send(single('Erro', `<h1 class="error">Não consegui verificar o pagamento agora</h1><p class="muted">Atualize a página em instantes.</p>`));
  }
});

// Webhook v2: responde imediatamente para evitar timeout.
// A segurança não depende do token enviado pelo webhook: o pagamento é consultado novamente na API do Asaas.
app.post('/webhook/asaas', (req, res) => {
  const event = String(req.body?.event || '');
  const paymentId = String(req.body?.payment?.id || '');
  res.status(200).json({ received: true });

  if (!['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event) || !paymentId) return;

  setImmediate(async () => {
    try {
      const verified = await verifyWebhookPayment(paymentId);
      if (!verified) return;
      paidOrders.set(verified.orderId, true);
      console.log('payment_verified', verified.orderId, paymentId);
    } catch (e) {
      console.error('webhook_verify_error', e.data || e.message);
    }
  });
});

app.get('/download', async (req, res) => {
  const orderId = String(req.query.order || '');
  const sig = String(req.query.sig || '');
  if (!safeEqual(sign(`download:${orderId}`), sig)) return res.status(403).send('Link inválido.');
  if (downloadsInProgress.has(orderId)) return res.status(409).send('Download em andamento.');

  downloadsInProgress.add(orderId);
  try {
    if (await isConsumed(orderId)) return res.status(410).send(single('Download utilizado', `<h1 class="error">Este download já foi utilizado</h1>`));

    let paid = paidOrders.get(orderId) === true;
    if (!paid) {
      const payment = await getOrderPayment(orderId);
      paid = paymentIsPaid(payment);
    }
    if (!paid) return res.status(403).send('Pagamento não confirmado.');
    if (!PRODUCT_FILE_URL) throw new Error('PRODUCT_FILE_URL não configurada');

    const fileRes = await fetch(PRODUCT_FILE_URL, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!fileRes.ok) throw new Error(`Falha ao buscar arquivo: HTTP ${fileRes.status}`);
    const zip = Buffer.from(await fileRes.arrayBuffer());
    if (!zip.length) throw new Error('Arquivo vazio');

    const claimed = await claim(orderId);
    if (!claimed) return res.status(410).send('Este download já foi utilizado.');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="SHEED_Rico_China.zip"');
    res.setHeader('Content-Length', String(zip.length));
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(zip);
  } catch (e) {
    console.error('download_error', e.message);
    if (!res.headersSent) res.status(500).send('Erro ao entregar o arquivo.');
  } finally {
    downloadsInProgress.delete(orderId);
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Rico extension backend v2 on ${PORT}`));
