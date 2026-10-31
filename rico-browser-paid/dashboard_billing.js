const crypto = require('crypto');

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_ENV = process.env.ASAAS_ENV === 'sandbox' ? 'sandbox' : 'production';
const ASAAS_BASE = ASAAS_ENV === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
const DASHBOARD_BILLING_SECRET = process.env.DASHBOARD_BILLING_SECRET || '';
const DASHBOARD_PUBLIC_URL = (process.env.DASHBOARD_PUBLIC_URL || 'https://dashboard-equipe-rico.onrender.com').replace(/\/$/, '');
const SUPABASE_URL = 'https://ytjwwgskilygayjrycfk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_hNMbrbwaUMxkkuOmGyUL9w_d1Ci9Og8';

const PLANS = Object.freeze({
  monthly: {
    value: 29.99,
    name: 'Dashboard Rico Mensal',
    description: 'Acesso ao Dashboard por 30 dias',
  },
  lifetime: {
    value: 79.99,
    name: 'Dashboard Rico Vitalicio',
    description: 'Acesso vitalicio ao Dashboard',
  },
});

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  return aa.length > 0 && aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function signSession(payload) {
  if (!DASHBOARD_BILLING_SECRET) return '';
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', DASHBOARD_BILLING_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifySession(token) {
  try {
    if (!DASHBOARD_BILLING_SECRET) return null;
    const [body, signature] = String(token || '').split('.');
    if (!body || !signature) return null;
    const expected = crypto.createHmac('sha256', DASHBOARD_BILLING_SECRET).update(body).digest('base64url');
    if (!safeEqual(signature, expected)) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.kind !== 'dashboard-checkout' || !data.exp || Date.now() > data.exp) return null;
    if (!PLANS[data.plan]) return null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(data.userId || ''))) return null;
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
      'User-Agent': 'DashboardEquipeRico/1.0',
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
  const result = await asaas(`/payments?checkoutSession=${encodeURIComponent(checkoutId)}&limit=100`, {
    method: 'GET',
  });
  const payments = Array.isArray(result.data) ? result.data : [];
  return payments.some((payment) => ['RECEIVED', 'CONFIRMED'].includes(payment.status));
}

async function grantAccess({ userId, plan, checkoutId }) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/grant_cpa_paid_access`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      p_admin_secret: DASHBOARD_BILLING_SECRET,
      p_user_id: userId,
      p_plan: plan,
      p_checkout_id: checkoutId,
    }),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok || !data || data.ok !== true) {
    const error = new Error('dashboard_activation_failed');
    error.status = response.status;
    error.data = data || text;
    throw error;
  }
  return data;
}

function setCors(req, res) {
  const origin = String(req.headers.origin || '');
  if (origin && origin === DASHBOARD_PUBLIC_URL) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  return !origin || origin === DASHBOARD_PUBLIC_URL;
}

function registerDashboardBilling(app) {
  if (app.__dashboardBillingRegistered) return;
  app.__dashboardBillingRegistered = true;

  app.options('/api/dashboard/*splat', (req, res) => {
    setCors(req, res);
    return res.status(204).end();
  });

  app.get('/api/dashboard/health', (req, res) => {
    if (!setCors(req, res)) return res.status(403).json({ ok: false });
    res.json({
      ok: true,
      asaasConfigured: Boolean(ASAAS_API_KEY),
      billingConfigured: Boolean(DASHBOARD_BILLING_SECRET),
    });
  });

  app.post('/api/dashboard/checkout', async (req, res) => {
    if (!setCors(req, res)) return res.status(403).json({ error: 'Origem nao autorizada.' });
    if (!ASAAS_API_KEY || !DASHBOARD_BILLING_SECRET) {
      return res.status(503).json({ error: 'Pagamento do Dashboard em configuracao.' });
    }

    const userId = String(req.body && req.body.userId || '').trim();
    const plan = String(req.body && req.body.plan || '').trim();
    const selected = PLANS[plan];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return res.status(400).json({ error: 'Usuario invalido.' });
    }
    if (!selected) return res.status(400).json({ error: 'Plano invalido.' });

    try {
      const orderId = crypto.randomUUID();
      const checkout = await asaas('/checkouts', {
        method: 'POST',
        body: JSON.stringify({
          billingTypes: ['PIX'],
          chargeTypes: ['DETACHED'],
          minutesToExpire: 60,
          externalReference: `dashboard:${orderId}`,
          callback: {
            successUrl: `${DASHBOARD_PUBLIC_URL}/?billing=return`,
            cancelUrl: `${DASHBOARD_PUBLIC_URL}/?billing=cancelado`,
            expiredUrl: `${DASHBOARD_PUBLIC_URL}/?billing=expirado`,
          },
          items: [{
            name: selected.name,
            description: selected.description,
            quantity: 1,
            value: selected.value,
          }],
        }),
      });
      if (!checkout.id) throw new Error('checkout_without_id');

      const billingToken = signSession({
        kind: 'dashboard-checkout',
        checkoutId: checkout.id,
        userId,
        plan,
        orderId,
        exp: Date.now() + 2 * 60 * 60 * 1000,
      });

      res.json({
        checkoutId: checkout.id,
        plan,
        value: selected.value,
        billingToken,
        checkoutUrl: `https://asaas.com/checkoutSession/show?id=${encodeURIComponent(checkout.id)}`,
      });
    } catch (error) {
      console.error('dashboard_checkout_error', error.status || '', error.data || error.message);
      res.status(502).json({ error: 'Nao foi possivel gerar o PIX agora.' });
    }
  });

  app.post('/api/dashboard/status', async (req, res) => {
    if (!setCors(req, res)) return res.status(403).json({ error: 'Origem nao autorizada.' });
    if (!ASAAS_API_KEY || !DASHBOARD_BILLING_SECRET) {
      return res.status(503).json({ error: 'Pagamento do Dashboard em configuracao.' });
    }

    const session = verifySession(req.body && req.body.billingToken);
    if (!session) return res.status(401).json({ error: 'Sessao de pagamento invalida ou expirada.' });

    try {
      const paid = await checkoutWasPaid(session.checkoutId);
      if (!paid) return res.json({ paid: false, activated: false, plan: session.plan });

      const access = await grantAccess({
        userId: session.userId,
        plan: session.plan,
        checkoutId: session.checkoutId,
      });

      res.json({
        paid: true,
        activated: true,
        plan: session.plan,
        checkoutId: session.checkoutId,
        access,
      });
    } catch (error) {
      console.error('dashboard_status_error', error.status || '', error.data || error.message);
      res.status(502).json({ error: 'Pagamento confirmado, mas nao foi possivel liberar o acesso agora.' });
    }
  });
}

module.exports = { registerDashboardBilling };
