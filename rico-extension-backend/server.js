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

const paidOrders = new Map();

function html(title, body) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  body{margin:0;background:#070b14;color:#eef4ff;font-family:Inter,system-ui,Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(680px,100%);background:#0d1424;border:1px solid #1f3154;border-radius:22px;padding:28px;box-shadow:0 24px 80px #0008}.brand{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#62a2ff}.title{font-size:32px;line-height:1.08;margin:10px 0 12px}.muted{color:#a8b7d4;line-height:1.6}.ok{color:#65e5a5}.warn{color:#ffd166}.btn{display:inline-block;margin-top:18px;background:#1677ff;color:white;text-decoration:none;padding:14px 20px;border-radius:12px;font-weight:800;border:0;cursor:pointer}.small{font-size:13px;color:#8294b5;margin-top:14px}.price{font-size:36px;font-weight:900;margin:18px 0}.error{color:#ff8f8f}</style></head><body><main class="card"><div class="brand">Rico China</div>${body}</main></body></html>`;
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
async function asaas(path, options = {}) {
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada');
  const res = await fetch(`${ASAAS_API_BASE}${path}`, {
    ...options,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      access_token: ASAAS_API_KEY,
      'User-Agent': 'RicoChinaExtension/1.0',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`Asaas ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

app.get('/', (req, res) => {
  res.send(html(PRODUCT_NAME, `<h1 class="title">${PRODUCT_NAME}</h1><p class="muted">Entrega automática após confirmação do pagamento.</p><div class="price">R$ ${PRICE.toFixed(2).replace('.', ',')}</div><a class="btn" href="/checkout">Comprar e pagar</a><p class="small">Pagamento processado pelo Asaas.</p>`));
});

app.get('/health', (req, res) => res.json({ ok: true, service: 'rico-china-extension-delivery' }));

app.get('/checkout', async (req, res) => {
  try {
    if (!PUBLIC_BASE_URL) throw new Error('PUBLIC_BASE_URL não configurada');
    if (!DOWNLOAD_SECRET) throw new Error('DOWNLOAD_SECRET não configurada');
    const orderId = `ricoext_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const sig = signOrder(orderId);
    const successUrl = `${PUBLIC_BASE_URL}/sucesso?order=${encodeURIComponent(orderId)}&sig=${sig}`;

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
    res.status(500).send(html('Erro', `<h1 class="title error">Não consegui abrir o pagamento</h1><p class="muted">${String(e.message || e)}</p><p class="small">Confira a configuração do Asaas no servidor.</p>`));
  }
});

async function findOrderPayment(orderId) {
  const links = await asaas(`/paymentLinks?limit=20&externalReference=${encodeURIComponent(orderId)}`, { method: 'GET', headers: { 'content-type': undefined } });
  const link = Array.isArray(links.data) ? links.data[0] : null;
  if (!link?.id) return null;

  const payments = await asaas('/payments?limit=100&offset=0', { method: 'GET', headers: { 'content-type': undefined } });
  const list = Array.isArray(payments.data) ? payments.data : [];
  const payment = list.find(p => p.paymentLink === link.id);
  return payment || null;
}

app.get('/sucesso', async (req, res) => {
  const orderId = String(req.query.order || '');
  const sig = String(req.query.sig || '');
  if (!validOrderSignature(orderId, sig)) {
    return res.status(403).send(html('Link inválido', `<h1 class="title error">Link inválido</h1><p class="muted">Não foi possível validar este pedido.</p>`));
  }

  try {
    let paid = paidOrders.get(orderId) === true;
    if (!paid) {
      const payment = await findOrderPayment(orderId);
      paid = !!payment && ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(payment.status);
      if (paid) paidOrders.set(orderId, true);
    }

    if (!paid) {
      return res.status(202).send(html('Aguardando confirmação', `<h1 class="title warn">Pagamento em confirmação</h1><p class="muted">O Asaas ainda não confirmou o pagamento deste pedido. Aguarde alguns segundos e atualize esta página.</p><a class="btn" href="${req.originalUrl}">Verificar novamente</a>`));
    }

    const dlSig = crypto.createHmac('sha256', DOWNLOAD_SECRET).update(`download:${orderId}`).digest('hex');
    return res.send(html('Pagamento confirmado', `<h1 class="title ok">Pagamento confirmado ✓</h1><p class="muted">Seu arquivo foi liberado.</p><a class="btn" href="/download?order=${encodeURIComponent(orderId)}&sig=${dlSig}">Baixar SHEED_Rico_China.zip</a><p class="small">O link é individual para este pedido.</p>`));
  } catch (e) {
    console.error('success_check_error', e.data || e.message);
    res.status(500).send(html('Erro', `<h1 class="title error">Não consegui verificar agora</h1><p class="muted">Atualize a página em alguns instantes.</p>`));
  }
});

app.post('/webhook/asaas', async (req, res) => {
  const token = req.get('asaas-access-token') || '';
  if (!ASAAS_WEBHOOK_TOKEN || token !== ASAAS_WEBHOOK_TOKEN) return res.status(401).json({ ok: false });
  try {
    const event = req.body?.event;
    const payment = req.body?.payment || {};
    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event) && payment.paymentLink) {
      try {
        const link = await asaas(`/paymentLinks/${encodeURIComponent(payment.paymentLink)}`, { method: 'GET', headers: { 'content-type': undefined } });
        const orderId = link.externalReference;
        if (orderId && String(orderId).startsWith('ricoext_')) paidOrders.set(String(orderId), true);
      } catch (e) {
        console.error('webhook_link_lookup_error', e.data || e.message);
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('webhook_error', e.message);
    res.status(500).json({ received: false });
  }
});

app.get('/download', async (req, res) => {
  const orderId = String(req.query.order || '');
  const sig = String(req.query.sig || '');
  const expected = DOWNLOAD_SECRET ? crypto.createHmac('sha256', DOWNLOAD_SECRET).update(`download:${orderId}`).digest('hex') : '';
  if (!expected || !sig || expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return res.status(403).send('Link inválido.');
  }
  try {
    let paid = paidOrders.get(orderId) === true;
    if (!paid) {
      const payment = await findOrderPayment(orderId);
      paid = !!payment && ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(payment.status);
    }
    if (!paid) return res.status(403).send('Pagamento não confirmado.');
    if (!PRODUCT_FILE_URL) return res.status(503).send('Arquivo ainda não configurado no servidor.');

    const upstream = await fetch(PRODUCT_FILE_URL, { redirect: 'follow' });
    if (!upstream.ok || !upstream.body) return res.status(502).send('Não foi possível carregar o arquivo.');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="SHEED_Rico_China.zip"');
    res.setHeader('Cache-Control', 'private, no-store');
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (e) {
    console.error('download_error', e.message);
    if (!res.headersSent) res.status(500).send('Erro ao entregar o arquivo.'); else res.end();
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Rico extension backend on ${PORT}`));
