const crypto = require('crypto');

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_ENV = process.env.ASAAS_ENV === 'sandbox' ? 'sandbox' : 'production';
const ASAAS_BASE = ASAAS_ENV === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
const BILLING_SECRET = process.env.RICO_PRODUCT_BILLING_SECRET || '';
const SUPABASE_URL = 'https://ytjwwgskilygayjrycfk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_hNMbrbwaUMxkkuOmGyUL9w_d1Ci9Og8';
const OPERACIONAL_ORIGIN = 'https://operacional-equipe-rico.onrender.com';
const PRICE = 129.99;

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  return aa.length > 0 && aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function signSession(payload) {
  if (!BILLING_SECRET) return '';
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', BILLING_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifySession(token) {
  try {
    if (!BILLING_SECRET) return null;
    const [body, signature] = String(token || '').split('.');
    if (!body || !signature) return null;
    const expected = crypto.createHmac('sha256', BILLING_SECRET).update(body).digest('base64url');
    if (!safeEqual(signature, expected)) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.kind !== 'operacional-checkout' || !data.exp || Date.now() > data.exp) return null;
    if (!data.checkoutId || !data.orderId) return null;
    return data;
  } catch {
    return null;
  }
}

async function asaas(path, options = {}) {
  const response = await fetch(`${ASAAS_BASE}${path}`, {
    ...options,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'User-Agent': 'OperacionalEquipeRico/1.0',
      access_token: ASAAS_API_KEY,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) {
    const error = new Error(`Asaas ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function checkoutWasPaid(checkoutId) {
  const result = await asaas(`/payments?checkoutSession=${encodeURIComponent(checkoutId)}&limit=100`, { method: 'GET' });
  const payments = Array.isArray(result.data) ? result.data : [];
  return payments.some((payment) => ['RECEIVED', 'CONFIRMED'].includes(payment.status));
}

const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function buildKey(orderId) {
  let raw = '';
  let round = 0;
  while (raw.length < 20) {
    const buf = crypto.createHmac('sha256', BILLING_SECRET).update(`${orderId}|operacional|${round++}`).digest();
    for (const byte of buf) {
      raw += KEY_ALPHABET[byte % KEY_ALPHABET.length];
      if (raw.length >= 20) break;
    }
  }
  const groups = raw.match(/.{1,4}/g) || [];
  return `OPERACIONAL-RICO-${groups.join('-')}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

async function fulfill(session, rawKey) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fulfill_rico_product_payment`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      p_admin_secret: BILLING_SECRET,
      p_checkout_id: session.checkoutId,
      p_product: 'operacional',
      p_plan: 'monthly',
      p_primary_key_hash: sha256(rawKey),
      p_secondary_key_hash: null,
      p_label: `Asaas operacional ${session.checkoutId}`,
    }),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok || !data || data.ok !== true) {
    const error = new Error('operacional_fulfillment_failed');
    error.status = response.status;
    error.data = data || text;
    throw error;
  }
  return data;
}

function setCors(req, res) {
  const origin = String(req.headers.origin || '');
  const allowed = origin === OPERACIONAL_ORIGIN;
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  return allowed;
}

function registerOperacionalBilling(app) {
  if (app.__operacionalBillingRegistered) return;
  app.__operacionalBillingRegistered = true;

  app.options('/api/operacional/*splat', (req, res) => {
    setCors(req, res);
    return res.status(204).end();
  });

  app.get('/api/operacional/health', (req, res) => {
    const origin = String(req.headers.origin || '');
    if (origin && !setCors(req, res)) return res.status(403).json({ ok: false });
    return res.json({ ok: true, asaasConfigured: Boolean(ASAAS_API_KEY), billingConfigured: Boolean(BILLING_SECRET), value: PRICE });
  });

  app.post('/api/operacional/checkout', async (req, res) => {
    if (!setCors(req, res)) return res.status(403).json({ error: 'Origem nao autorizada.' });
    if (!ASAAS_API_KEY || !BILLING_SECRET) return res.status(503).json({ error: 'Pagamento em configuracao.' });

    try {
      const orderId = crypto.randomUUID();
      const checkout = await asaas('/checkouts', {
        method: 'POST',
        body: JSON.stringify({
          billingTypes: ['PIX'],
          chargeTypes: ['DETACHED'],
          minutesToExpire: 60,
          externalReference: `operacional:${orderId}`,
          callback: {
            successUrl: `${OPERACIONAL_ORIGIN}/comprar.html?billing=return`,
            cancelUrl: `${OPERACIONAL_ORIGIN}/comprar.html?billing=cancelado`,
            expiredUrl: `${OPERACIONAL_ORIGIN}/comprar.html?billing=expirado`,
          },
          items: [{
            name: 'Operacional Rico 30 dias',
            description: 'Acesso ao Operacional Equipe Rico por 30 dias',
            quantity: 1,
            value: PRICE,
          }],
        }),
      });
      if (!checkout.id) throw new Error('checkout_without_id');

      const billingToken = signSession({
        kind: 'operacional-checkout',
        checkoutId: checkout.id,
        orderId,
        exp: Date.now() + 2 * 60 * 60 * 1000,
      });

      return res.json({
        checkoutId: checkout.id,
        value: PRICE,
        billingToken,
        checkoutUrl: `https://asaas.com/checkoutSession/show?id=${encodeURIComponent(checkout.id)}`,
      });
    } catch (error) {
      console.error('operacional_checkout_error', error.status || '', error.data || error.message);
      return res.status(502).json({ error: 'Nao foi possivel gerar o PIX agora.' });
    }
  });

  app.post('/api/operacional/status', async (req, res) => {
    if (!setCors(req, res)) return res.status(403).json({ error: 'Origem nao autorizada.' });
    if (!ASAAS_API_KEY || !BILLING_SECRET) return res.status(503).json({ error: 'Pagamento em configuracao.' });

    const session = verifySession(req.body?.billingToken);
    if (!session) return res.status(401).json({ error: 'Sessao de pagamento invalida ou expirada.' });

    try {
      const paid = await checkoutWasPaid(session.checkoutId);
      if (!paid) return res.json({ paid: false, fulfilled: false });
      const primaryKey = buildKey(session.orderId);
      const fulfillment = await fulfill(session, primaryKey);
      return res.json({
        paid: true,
        fulfilled: true,
        plan: 'monthly',
        days: 30,
        key: primaryKey,
        fulfillment,
      });
    } catch (error) {
      console.error('operacional_status_error', error.status || '', error.data || error.message);
      return res.status(502).json({ error: 'Pagamento confirmado, mas nao foi possivel liberar o acesso agora.' });
    }
  });
}

module.exports = { registerOperacionalBilling };
