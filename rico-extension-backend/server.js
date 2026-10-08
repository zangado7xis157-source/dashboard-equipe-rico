const express = require('express');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 10000;
const ASAAS_API_BASE = process.env.ASAAS_API_BASE || 'https://api.asaas.com/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || '';
const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || '';
const PRODUCT_FILE_URL = process.env.PRODUCT_FILE_URL || '';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const PRICE = Number(process.env.PRODUCT_PRICE || '21.99');
const PRODUCT_NAME = process.env.PRODUCT_NAME || 'Extensão Rico China';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const DOWNLOAD_DB_SECRET = process.env.DOWNLOAD_DB_SECRET || '';
const TUTORIAL_URL = 'https://youtu.be/EwB7ouO_3M8?si=7pY1cByZfiI5ejdH';
const TUTORIAL_IMAGE = 'https://i.ytimg.com/vi/EwB7ouO_3M8/maxresdefault.jpg';

const paidOrders = new Map();
const consumedDownloads = new Set();
const downloadsInProgress = new Set();

function html(title, body) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#050914;color:#eef4ff;font-family:Inter,system-ui,Arial,sans-serif;min-height:100vh}.wrap{width:min(1100px,92vw);margin:auto}.top{padding:26px 0}.brand{font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#70a8ff}.hero{padding:48px 0 26px;text-align:center}.badge{display:inline-block;padding:8px 13px;border-radius:999px;background:#0b1c39;border:1px solid #1d4c8c;color:#8fb9ff;font-size:13px;font-weight:800}.hero h1{font-size:clamp(38px,7vw,72px);line-height:.98;margin:18px auto 16px;max-width:950px}.hero h1 span{color:#2887ff}.lead{max-width:760px;margin:0 auto;color:#aebbd2;font-size:18px;line-height:1.65}.price{font-size:46px;font-weight:950;margin:24px 0 8px}.price small{font-size:15px;color:#97a6bf;font-weight:700}.btn{display:inline-block;background:#1677ff;color:#fff;text-decoration:none;padding:17px 28px;border-radius:14px;font-weight:900;box-shadow:0 12px 36px #1677ff44;border:1px solid #58a0ff}.btn:hover{filter:brightness(1.08)}.btn.video{background:#e62117;border-color:#ff6b63;box-shadow:0 12px 36px #e6211740;margin-top:12px}.note{font-size:13px;color:#7f8da7;margin-top:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:42px 0}.card{background:linear-gradient(180deg,#0d1527,#0a1120);border:1px solid #1a2d4d;border-radius:18px;padding:22px;box-shadow:0 18px 55px #0005}.card h3{margin:0 0 8px;font-size:18px}.card p{margin:0;color:#9eacc3;line-height:1.55}.section{padding:38px 0}.section h2{text-align:center;font-size:32px;margin:0 0 22px}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.num{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#1677ff;font-weight:900;margin-bottom:12px}.cta{margin:40px 0 70px;text-align:center;padding:34px;border-radius:22px;background:radial-gradient(circle at top,#123d7d,#0b1428 65%);border:1px solid #24538f}.cta h2{font-size:34px;margin:0 0 8px}.muted{color:#a8b7d4;line-height:1.6}.ok{color:#65e5a5}.warn{color:#ffd166}.small{font-size:13px;color:#8294b5;margin-top:14px}.error{color:#ff8f8f}.single{min-height:100vh;display:grid;place-items:center;padding:24px}.single .card{width:min(680px,100%)}.tutorial{margin-top:24px;padding-top:22px;border-top:1px solid #1a2d4d}.tutorial h2{font-size:22px;margin:0 0 8px}.tutorial img{display:block;width:100%;max-width:560px;margin:14px auto 0;border-radius:14px;border:1px solid #28456f;box-shadow:0 14px 40px #0007}footer{text-align:center;color:#697891;font-size:12px;padding:0 0 35px}@media(max-width:800px){.grid,.steps{grid-template-columns:1fr}.hero{padding-top:25px}.hero h1{font-size:42px}.price{font-size:38px}}
  </style></head><body>${body}</body></html>`;
}

function singlePage(title, body) {
  return html(title, `<div class="single"><main class="card"><div class="brand">Rico China</div>${body}</main></div>`);
}

function signOrder(orderId) {
  if (!DOWNLOAD_SECRET) return '';
  return crypto.createHmac('sha256', DOWNLOAD_SECRET).update(orderId).digest('hex');
}

function validOrderSignature(orderId, sig) {
  const expected = signOrder(orderId);
  if (!expected || !sig || expected.length !== sig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

async function asaas(apiPath, options = {}) {
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada');
  const headers = { accept: 'application/json', access_token: ASAAS_API_KEY, 'User-Agent': 'RicoChinaExtension/1.0', ...(options.headers || {}) };
  if (options.body) headers['content-type'] = 'application/json';
  const res = await fetch(`${ASAAS_API_BASE}${apiPath}`, { ...options, headers });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) { const err = new Error(`Asaas ${res.status}`); err.status = res.status; err.data = data; throw err; }
  return data;
}

function supabaseHeaders(extra = {}) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !DOWNLOAD_DB_SECRET) throw new Error('Banco de downloads não configurado');
  return { apikey: SUPABASE_PUBLISHABLE_KEY, 'x-download-secret': DOWNLOAD_DB_SECRET, ...extra };
}

async function isDownloadConsumed(orderId) {
  if (consumedDownloads.has(orderId)) return true;
  const url = `${SUPABASE_URL}/rest/v1/extension_downloads?order_id=eq.${encodeURIComponent(orderId)}&select=order_id&limit=1`;
  const res = await fetch(url, { headers: supabaseHeaders({ accept: 'application/json' }) });
  if (!res.ok) throw new Error(`Falha ao consultar download: HTTP ${res.status}`);
  const rows = await res.json();
  const used = Array.isArray(rows) && rows.length > 0;
  if (used) consumedDownloads.add(orderId);
  return used;
}

async function claimDownload(orderId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/extension_downloads`, {
    method: 'POST',
    headers: supabaseHeaders({ 'content-type': 'application/json', accept: 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({ order_id: orderId })
  });
  if (res.status === 409) return false;
  if (!res.ok) throw new Error(`Falha ao registrar download: HTTP ${res.status}`);
  consumedDownloads.add(orderId);
  return true;
}

app.get('/', (req, res) => {
  const price = PRICE.toFixed(2).replace('.', ',');
  res.send(html(PRODUCT_NAME, `
    <header class="top"><div class="wrap"><div class="brand">Rico China</div></div></header>
    <main>
      <section class="hero wrap">
        <div class="badge">EXTENSÃO RICO CHINA</div>
        <h1>Aceleração de Slot para <span>CPA Chinês</span></h1>
        <p class="lead">Extensão prática para acelerar sua navegação e operação. Compra simples, pagamento pelo Asaas e entrega automática do arquivo após a confirmação.</p>
        <div class="price">R$ ${price} <small>pagamento único</small></div>
        <a class="btn" href="/checkout">Comprar agora</a>
        <div class="note">Pagamento processado pelo Asaas • Liberação automática após confirmação</div>
      </section>

      <section class="wrap">
        <div class="grid">
          <article class="card"><h3>⚡ Instalação simples</h3><p>Você recebe o arquivo ZIP e pode adicionar a extensão ao navegador seguindo as instruções.</p></article>
          <article class="card"><h3>🔒 Entrega protegida</h3><p>O download é liberado somente após a confirmação do pagamento e o link é individual para cada pedido.</p></article>
          <article class="card"><h3>📦 Download automático</h3><p>Depois do pagamento aprovado, você retorna para a página de confirmação e baixa seu arquivo.</p></article>
        </div>
      </section>

      <section class="section wrap">
        <h2>Como funciona</h2>
        <div class="steps">
          <article class="card"><div class="num">1</div><h3>Clique em comprar</h3><p>Você será direcionado para o checkout seguro do Asaas.</p></article>
          <article class="card"><div class="num">2</div><h3>Faça o pagamento</h3><p>Após a confirmação, o sistema libera automaticamente o seu pedido.</p></article>
          <article class="card"><div class="num">3</div><h3>Baixe o arquivo</h3><p>O download é único por pedido e fica bloqueado após ser utilizado.</p></article>
        </div>
      </section>

      <section class="cta wrap">
        <h2>Pronto para começar?</h2>
        <p class="muted">Garanta agora sua Extensão Rico China.</p>
        <div class="price">R$ ${price}</div>
        <a class="btn" href="/checkout">Comprar agora</a>
      </section>
    </main>
    <footer class="wrap">Produto digital. Conteúdo destinado a maiores de 18 anos. Não garantimos resultados financeiros. Use de forma responsável.</footer>
  `));
});

app.get('/health', async (req, res) => {
  let dbReady = false;
  try { dbReady = !!SUPABASE_URL && !!SUPABASE_PUBLISHABLE_KEY && !!DOWNLOAD_DB_SECRET; } catch {}
  res.json({ ok: true, service: 'rico-china-extension-delivery', productReady: !!PRODUCT_FILE_URL, persistentDownloads: dbReady });
});

app.get('/checkout', async (req, res) => {
  try {
    if (!PUBLIC_BASE_URL) throw new Error('PUBLIC_BASE_URL não configurada');
    if (!DOWNLOAD_SECRET) throw new Error('DOWNLOAD_SECRET não configurada');
    const orderId = `ricoext_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const sig = signOrder(orderId);
    const successUrl = `${PUBLIC_BASE_URL}/sucesso?order=${encodeURIComponent(orderId)}&sig=${sig}`;
    const link = await asaas('/paymentLinks', { method: 'POST', body: JSON.stringify({ name: `${PRODUCT_NAME} - ${orderId.slice(-8)}`, description: 'Aceleração de Slot para CPA Chinês', value: PRICE, billingType: 'UNDEFINED', chargeType: 'DETACHED', dueDateLimitDays: 1, externalReference: orderId, notificationEnabled: true, callback: { successUrl, autoRedirect: true } }) });
    if (!link.url) throw new Error('O Asaas não retornou a URL do pagamento');
    res.redirect(302, link.url);
  } catch (e) {
    console.error('checkout_error', e.data || e.message);
    res.status(500).send(singlePage('Erro', `<h1 class="error">Não consegui abrir o pagamento</h1><p class="muted">${String(e.message || e)}</p>`));
  }
});

async function findOrderPayment(orderId) {
  const links = await asaas(`/paymentLinks?limit=20&externalReference=${encodeURIComponent(orderId)}`, { method: 'GET' });
  const link = Array.isArray(links.data) ? links.data[0] : null;
  if (!link?.id) return null;
  const payments = await asaas('/payments?limit=100&offset=0', { method: 'GET' });
  const list = Array.isArray(payments.data) ? payments.data : [];
  return list.find(p => p.paymentLink === link.id) || null;
}

app.get('/sucesso', async (req, res) => {
  const orderId = String(req.query.order || '');
  const sig = String(req.query.sig || '');
  if (!validOrderSignature(orderId, sig)) return res.status(403).send(singlePage('Link inválido', `<h1 class="error">Link inválido</h1><p class="muted">Não foi possível validar este pedido.</p>`));
  try {
    let paid = paidOrders.get(orderId) === true;
    if (!paid) { const payment = await findOrderPayment(orderId); paid = !!payment && ['CONFIRMED','RECEIVED','RECEIVED_IN_CASH'].includes(payment.status); if (paid) paidOrders.set(orderId, true); }
    if (!paid) return res.status(202).send(singlePage('Aguardando confirmação', `<h1 class="warn">Pagamento em confirmação</h1><p class="muted">Aguarde alguns segundos e atualize esta página.</p><a class="btn" href="${req.originalUrl}">Verificar novamente</a>`));
    if (await isDownloadConsumed(orderId)) return res.status(410).send(singlePage('Download utilizado', `<h1 class="error">Este download já foi utilizado</h1><p class="muted">O arquivo só pode ser baixado uma vez por pedido.</p>`));
    const dlSig = crypto.createHmac('sha256', DOWNLOAD_SECRET).update(`download:${orderId}`).digest('hex');
    return res.send(singlePage('Pagamento confirmado', `<h1 class="ok">Pagamento confirmado ✓</h1><p class="muted">Seu arquivo foi liberado.</p><a class="btn" href="/download?order=${encodeURIComponent(orderId)}&sig=${dlSig}">Baixar SHEED_Rico_China.zip</a><p class="small">Download único: após baixar, este link será bloqueado permanentemente.</p><div class="tutorial"><h2>Como adicionar e usar a extensão</h2><p class="muted">Depois de baixar, assista ao tutorial completo para instalar e usar corretamente.</p><a href="${TUTORIAL_URL}" target="_blank" rel="noopener noreferrer"><img src="${TUTORIAL_IMAGE}" alt="Tutorial de como adicionar e usar a Extensão Rico China"></a><a class="btn video" href="${TUTORIAL_URL}" target="_blank" rel="noopener noreferrer">▶ Assistir tutorial no YouTube</a></div>`));
  } catch (e) { console.error('success_check_error', e.data || e.message); res.status(500).send(singlePage('Erro', `<h1 class="error">Não consegui verificar agora</h1>`)); }
});

app.post('/webhook/asaas', async (req, res) => {
  const token = req.get('asaas-access-token') || '';
  if (!ASAAS_WEBHOOK_TOKEN || token !== ASAAS_WEBHOOK_TOKEN) return res.status(401).json({ ok: false });
  try {
    const event = req.body?.event; const payment = req.body?.payment || {};
    if (['PAYMENT_CONFIRMED','PAYMENT_RECEIVED'].includes(event) && payment.paymentLink) {
      try { const link = await asaas(`/paymentLinks/${encodeURIComponent(payment.paymentLink)}`, { method: 'GET' }); const orderId = link.externalReference; if (orderId && String(orderId).startsWith('ricoext_')) paidOrders.set(String(orderId), true); } catch (e) { console.error('webhook_link_lookup_error', e.data || e.message); }
    }
    res.json({ received: true });
  } catch (e) { console.error('webhook_error', e.message); res.status(500).json({ received: false }); }
});

app.get('/download', async (req, res) => {
  const orderId = String(req.query.order || '');
  const sig = String(req.query.sig || '');
  const expected = DOWNLOAD_SECRET ? crypto.createHmac('sha256', DOWNLOAD_SECRET).update(`download:${orderId}`).digest('hex') : '';
  if (!expected || !sig || expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return res.status(403).send('Link inválido.');
  if (downloadsInProgress.has(orderId)) return res.status(410).send(singlePage('Link expirado', `<h1 class="error">Este download já foi utilizado</h1><p class="muted">O arquivo só pode ser baixado uma vez por pedido.</p>`));
  downloadsInProgress.add(orderId);
  try {
    if (await isDownloadConsumed(orderId)) { downloadsInProgress.delete(orderId); return res.status(410).send(singlePage('Link expirado', `<h1 class="error">Este download já foi utilizado</h1><p class="muted">O arquivo só pode ser baixado uma vez por pedido.</p>`)); }
    let paid = paidOrders.get(orderId) === true;
    if (!paid) { const payment = await findOrderPayment(orderId); paid = !!payment && ['CONFIRMED','RECEIVED','RECEIVED_IN_CASH'].includes(payment.status); }
    if (!paid) { downloadsInProgress.delete(orderId); return res.status(403).send('Pagamento não confirmado.'); }
    if (!PRODUCT_FILE_URL) throw new Error('PRODUCT_FILE_URL não configurada');
    const fileRes = await fetch(PRODUCT_FILE_URL, { redirect: 'follow' });
    if (!fileRes.ok) throw new Error(`Falha ao buscar arquivo: HTTP ${fileRes.status}`);
    const zip = Buffer.from(await fileRes.arrayBuffer());
    if (!zip.length) throw new Error('Arquivo vazio');
    const claimed = await claimDownload(orderId);
    if (!claimed) { downloadsInProgress.delete(orderId); return res.status(410).send(singlePage('Link expirado', `<h1 class="error">Este download já foi utilizado</h1><p class="muted">O arquivo só pode ser baixado uma vez por pedido.</p>`)); }
    downloadsInProgress.delete(orderId);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="SHEED_Rico_China.zip"');
    res.setHeader('Content-Length', String(zip.length));
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(zip);
  } catch (e) {
    downloadsInProgress.delete(orderId);
    console.error('download_error', e.message);
    res.status(500).send('Erro ao entregar o arquivo.');
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Rico extension backend on ${PORT}`));