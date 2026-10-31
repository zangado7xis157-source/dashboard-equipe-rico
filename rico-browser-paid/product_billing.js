const crypto = require('crypto');

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_ENV = process.env.ASAAS_ENV === 'sandbox' ? 'sandbox' : 'production';
const ASAAS_BASE = ASAAS_ENV === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
const BILLING_SECRET = process.env.RICO_PRODUCT_BILLING_SECRET || '';
const SUPABASE_URL = 'https://ytjwwgskilygayjrycfk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_hNMbrbwaUMxkkuOmGyUL9w_d1Ci9Og8';

const PRODUCTS = Object.freeze({
  bot_beta: {
    callbackPath: '/',
    origins: new Set([
      'https://bot-beta-cz15.onrender.com',
      'https://controle-rico-oficial.onrender.com',
    ]),
    plans: {
      daily: { value: 20.00, name: 'Bot Beta Diario', description: 'Acesso ao Bot Beta por 24 horas' },
      weekly: { value: 50.00, name: 'Bot Beta Semanal', description: 'Acesso ao Bot Beta por 7 dias' },
      monthly: { value: 100.00, name: 'Bot Beta Mensal', description: 'Acesso ao Bot Beta por 30 dias' },
      lifetime: { value: 300.00, name: 'Bot Beta Vitalicio', description: 'Acesso vitalicio ao Bot Beta' },
    },
  },
  list_prime: {
    callbackPath: '/pagamento.html',
    origins: new Set(['https://rico-cpa-casas.onrender.com']),
    plans: {
      monthly: { value: 49.99, name: 'Lista Prime 30 dias', description: 'Acesso a Lista Prime por 30 dias' },
    },
  },
});

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
    const product = PRODUCTS[data.product];
    if (data.kind !== 'rico-product-checkout' || !data.exp || Date.now() > data.exp) return null;
    if (!product || !product.plans[data.plan] || !product.origins.has(data.origin)) return null;
    if (!data.checkoutId || !data.orderId) return null;
    return data;
  } catch {
    return null;
  }
}

async function asaas(url, options = {}) {
  const response = await fetch(`${ASAAS_BASE}${url}`, {
    ...options,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'User-Agent': 'RicoProdutos/1.0',
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
function derivedChars(seed, count) {
  let out = '';
  let round = 0;
  while (out.length < count) {
    const buf = crypto.createHmac('sha256', BILLING_SECRET).update(`${seed}|${round++}`).digest();
    for (const byte of buf) {
      out += KEY_ALPHABET[byte % KEY_ALPHABET.length];
      if (out.length >= count) break;
    }
  }
  return out;
}
function grouped(prefix, seed, count) {
  const raw = derivedChars(seed, count);
  const parts = [];
  for (let i = 0; i < raw.length; i += 4) parts.push(raw.slice(i, i + 4));
  return `${prefix}-${parts.join('-')}`;
}
function keysFor(session) {
  const base = `${session.orderId}|${session.product}|${session.plan}`;
  if (session.product === 'bot_beta') {
    return {
      primaryKey: grouped('BOT-BETA-RICO', `${base}|primary`, 16),
      downloadKey: grouped('DOWNLOAD-RICO', `${base}|download`, 20),
    };
  }
  if (session.product === 'list_prime') {
    return { primaryKey: grouped('PRIME', `${base}|primary`, 20) };
  }
  return {};
}
function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

async function fulfill(session, keys) {
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
      p_product: session.product,
      p_plan: session.plan,
      p_primary_key_hash: sha256(keys.primaryKey),
      p_secondary_key_hash: keys.downloadKey ? sha256(keys.downloadKey) : null,
      p_label: `Asaas ${session.product} ${session.checkoutId}`,
    }),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok || !data || data.ok !== true) {
    const error = new Error('product_fulfillment_failed');
    error.status = response.status;
    error.data = data || text;
    throw error;
  }
  return data;
}

function originAllowed(productId, origin) {
  const product = PRODUCTS[productId];
  return Boolean(product && origin && product.origins.has(origin));
}

function setCors(req, res) {
  const origin = String(req.headers.origin || '');
  const allowed = Object.values(PRODUCTS).some((product) => product.origins.has(origin));
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  return allowed;
}

function registerProductBilling(app) {
  if (app.__productBillingRegistered) return;
  app.__productBillingRegistered = true;

  app.options('/api/products/*splat', (req, res) => {
    setCors(req, res);
    return res.status(204).end();
  });

  app.get('/api/products/health', (req, res) => {
    const origin = String(req.headers.origin || '');
    if (origin && !setCors(req, res)) return res.status(403).json({ ok: false });
    res.json({ ok: true, asaasConfigured: Boolean(ASAAS_API_KEY), billingConfigured: Boolean(BILLING_SECRET) });
  });

  app.post('/api/products/checkout', async (req, res) => {
    if (!setCors(req, res)) return res.status(403).json({ error: 'Origem nao autorizada.' });
    if (!ASAAS_API_KEY || !BILLING_SECRET) return res.status(503).json({ error: 'Pagamento em configuracao.' });

    const origin = String(req.headers.origin || '');
    const productId = String(req.body?.product || '').trim();
    const planId = String(req.body?.plan || '').trim();
    const product = PRODUCTS[productId];
    const plan = product?.plans?.[planId];
    if (!product || !plan || !originAllowed(productId, origin)) return res.status(400).json({ error: 'Produto ou plano invalido.' });

    try {
      const orderId = crypto.randomUUID();
      const callback = `${origin}${product.callbackPath}`;
      const checkout = await asaas('/checkouts', {
        method: 'POST',
        body: JSON.stringify({
          billingTypes: ['PIX'],
          chargeTypes: ['DETACHED'],
          minutesToExpire: 60,
          externalReference: `${productId}:${orderId}`,
          callback: {
            successUrl: `${callback}?billing=return`,
            cancelUrl: `${callback}?billing=cancelado`,
            expiredUrl: `${callback}?billing=expirado`,
          },
          items: [{ name: plan.name, description: plan.description, quantity: 1, value: plan.value }],
        }),
      });
      if (!checkout.id) throw new Error('checkout_without_id');

      const billingToken = signSession({
        kind: 'rico-product-checkout', checkoutId: checkout.id, orderId,
        product: productId, plan: planId, origin,
        exp: Date.now() + 2 * 60 * 60 * 1000,
      });
      res.json({
        checkoutId: checkout.id,
        product: productId,
        plan: planId,
        value: plan.value,
        billingToken,
        checkoutUrl: `https://asaas.com/checkoutSession/show?id=${encodeURIComponent(checkout.id)}`,
      });
    } catch (error) {
      console.error('product_checkout_error', error.status || '', error.data || error.message);
      res.status(502).json({ error: 'Nao foi possivel gerar o PIX agora.' });
    }
  });

  app.post('/api/products/status', async (req, res) => {
    if (!setCors(req, res)) return res.status(403).json({ error: 'Origem nao autorizada.' });
    if (!ASAAS_API_KEY || !BILLING_SECRET) return res.status(503).json({ error: 'Pagamento em configuracao.' });
    const origin = String(req.headers.origin || '');
    const session = verifySession(req.body?.billingToken);
    if (!session || session.origin !== origin) return res.status(401).json({ error: 'Sessao de pagamento invalida ou expirada.' });

    try {
      const paid = await checkoutWasPaid(session.checkoutId);
      if (!paid) return res.json({ paid: false, fulfilled: false, product: session.product, plan: session.plan });
      const keys = keysFor(session);
      if (!keys.primaryKey) throw new Error('keys_not_supported');
      const fulfillment = await fulfill(session, keys);
      res.json({ paid: true, fulfilled: true, product: session.product, plan: session.plan, keys, fulfillment });
    } catch (error) {
      console.error('product_status_error', error.status || '', error.data || error.message);
      res.status(502).json({ error: 'Pagamento confirmado, mas nao foi possivel liberar o produto agora.' });
    }
  });
}

module.exports = { registerProductBilling };
