const crypto = require('crypto');
const { Readable } = require('stream');

const BILLING_SECRET = process.env.RICO_PRODUCT_BILLING_SECRET || '';
const SUPABASE_URL = 'https://ytjwwgskilygayjrycfk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_hNMbrbwaUMxkkuOmGyUL9w_d1Ci9Og8';
const OPERACIONAL_ORIGIN = 'https://operacional-equipe-rico.onrender.com';

const LESSONS = Object.freeze({
  'aula-01': process.env.OPERACIONAL_VIDEO_AULA_01 || '',
  'aula-02': process.env.OPERACIONAL_VIDEO_AULA_02 || '',
  'aula-04': process.env.OPERACIONAL_VIDEO_AULA_04 || '',
});

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  return aa.length > 0 && aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function signVideoToken(payload) {
  if (!BILLING_SECRET) return '';
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', BILLING_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyVideoToken(token) {
  try {
    if (!BILLING_SECRET) return null;
    const [body, signature] = String(token || '').split('.');
    if (!body || !signature) return null;
    const expected = crypto.createHmac('sha256', BILLING_SECRET).update(body).digest('base64url');
    if (!safeEqual(signature, expected)) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.kind !== 'operacional-video' || !data.lesson || !data.exp || Date.now() > data.exp) return null;
    if (!LESSONS[data.lesson]) return null;
    return data;
  } catch {
    return null;
  }
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

async function validateKey(keyHash, deviceId) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/activate_operacional_equipe_rico_key`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      p_key_hash: String(keyHash || '').trim().toLowerCase(),
      p_device_id: String(deviceId || '').trim(),
    }),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error('key_validation_failed');
  return data;
}

async function fetchDriveVideo(fileId, range) {
  const headers = { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' };
  if (range) headers.Range = range;
  return fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`, {
    method: 'GET', headers, redirect: 'follow'
  });
}

function registerOperacionalPrivateVideo(app) {
  if (app.__operacionalPrivateVideoRegistered) return;
  app.__operacionalPrivateVideoRegistered = true;

  app.options('/api/operacional/video-access', (req, res) => {
    setCors(req, res);
    return res.status(204).end();
  });

  app.post('/api/operacional/video-access', async (req, res) => {
    if (!setCors(req, res)) return res.status(403).json({ error: 'Origem nao autorizada.' });
    if (!BILLING_SECRET) return res.status(503).json({ error: 'Protecao de video em configuracao.' });

    const lesson = String(req.body?.lesson || '').trim();
    const keyHash = String(req.body?.keyHash || '').trim().toLowerCase();
    const deviceId = String(req.body?.deviceId || '').trim();

    if (!LESSONS[lesson]) return res.status(404).json({ error: 'Aula nao encontrada.' });
    if (!/^[a-f0-9]{64}$/.test(keyHash)) return res.status(401).json({ error: 'Key invalida.' });
    if (deviceId.length < 16 || deviceId.length > 200) return res.status(401).json({ error: 'Dispositivo invalido.' });

    try {
      const access = await validateKey(keyHash, deviceId);
      if (!access?.ok) return res.status(401).json({ error: 'Acesso negado.', reason: access?.message || 'invalid_key' });

      const token = signVideoToken({
        kind: 'operacional-video', lesson, deviceId,
        exp: Date.now() + 2 * 60 * 60 * 1000,
      });

      return res.json({
        ok: true,
        videoUrl: `https://rico-browser-android-pago.onrender.com/api/operacional/video?token=${encodeURIComponent(token)}`,
      });
    } catch (error) {
      console.error('operacional_video_access_error', error.message || error);
      return res.status(502).json({ error: 'Nao foi possivel validar o acesso agora.' });
    }
  });

  app.get('/api/operacional/video', async (req, res) => {
    const data = verifyVideoToken(req.query.token);
    if (!data) return res.status(401).send('Acesso ao video invalido ou expirado.');
    const fileId = LESSONS[data.lesson];
    if (!fileId) return res.status(404).send('Video nao encontrado.');

    try {
      const upstream = await fetchDriveVideo(fileId, req.headers.range);
      const contentType = String(upstream.headers.get('content-type') || '');
      if (!upstream.ok || contentType.includes('text/html')) return res.status(502).send('Nao foi possivel carregar este video agora.');

      for (const header of ['content-type','content-length','content-range','accept-ranges','etag','last-modified']) {
        const value = upstream.headers.get(header);
        if (value) res.setHeader(header, value);
      }
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.status(upstream.status);
      if (!upstream.body) return res.end();
      Readable.fromWeb(upstream.body).pipe(res);
    } catch (error) {
      console.error('operacional_video_stream_error', error.message || error);
      if (!res.headersSent) return res.status(502).send('Nao foi possivel carregar este video agora.');
      res.end();
    }
  });
}

module.exports = { registerOperacionalPrivateVideo };
