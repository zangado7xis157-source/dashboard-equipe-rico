const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = 'https://ytjwwgskilygayjrycfk.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0and3Z3NraWx5Z2F5anJ5Y2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NzM4NTUsImV4cCI6MjEwNjU0OTg1NX0.avTRZstKk41cVH9oQAqXxdPVw8Q6jv9ARXabuK_4HrM';
const KEY_ADMIN_TOKEN = process.env.KEY_ADMIN_TOKEN || '';
const MOBILE_KEY_PIN = process.env.MOBILE_KEY_PIN || '';
const BOT_RSA_PRIVATE_XML = process.env.BOT_RSA_PRIVATE_XML || '';

const failedAuth = new Map();
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 8;
let cachedBotPrivateKey = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sendJson(res, status, data) {
  const body = Buffer.from(JSON.stringify(data));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  res.end(body);
}

function sendHtml(res, html, status = 200) {
  const body = Buffer.from(html, 'utf8');
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'"
  });
  res.end(body);
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  if (aa.length !== bb.length || aa.length === 0) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function checkPin(req, suppliedPin) {
  const ip = clientIp(req);
  const now = Date.now();
  let state = failedAuth.get(ip);
  if (state && now - state.first > FAIL_WINDOW_MS) {
    failedAuth.delete(ip);
    state = null;
  }
  if (state && state.count >= MAX_FAILS) {
    return { ok: false, status: 429, message: 'Muitas tentativas. Aguarde alguns minutos.' };
  }

  const supplied = String(suppliedPin || '').trim();
  if (!safeEqual(supplied, MOBILE_KEY_PIN)) {
    if (!state) state = { count: 0, first: now };
    state.count += 1;
    failedAuth.set(ip, state);
    return { ok: false, status: 401, message: 'Senha incorreta.' };
  }

  failedAuth.delete(ip);
  return { ok: true };
}

function newDownloadKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let raw = '';
  for (let i = 0; i < 20; i += 1) {
    raw += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return `DOWNLOAD-RICO-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}`;
}

async function registerDownloadKey(rawKey, label) {
  const hash = crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_controle_rico_download_key`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_admin_token: KEY_ADMIN_TOKEN,
      p_key_hash: hash,
      p_label: label || null
    })
  });

  const text = await response.text();
  if (!response.ok) {
    console.error('Supabase RPC HTTP', response.status, text);
    throw new Error('Falha ao cadastrar a key de download.');
  }

  let result;
  try { result = JSON.parse(text); } catch { result = null; }
  if (!result || result.ok !== true) {
    console.error('Supabase RPC result', text);
    const err = new Error('Falha ao cadastrar a key de download.');
    err.kind = result?.kind || result?.message || 'unknown';
    throw err;
  }
  return result;
}

function xmlValue(xml, tag) {
  const match = String(xml).match(new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i'));
  if (!match) throw new Error(`Chave RSA incompleta: ${tag}`);
  return match[1].replace(/\s+/g, '');
}

function b64ToUrl(value) {
  return Buffer.from(value, 'base64').toString('base64url');
}

function getBotPrivateKey() {
  if (cachedBotPrivateKey) return cachedBotPrivateKey;
  if (!BOT_RSA_PRIVATE_XML) throw new Error('Chave de assinatura do app não configurada.');

  const jwk = {
    kty: 'RSA',
    n: b64ToUrl(xmlValue(BOT_RSA_PRIVATE_XML, 'Modulus')),
    e: b64ToUrl(xmlValue(BOT_RSA_PRIVATE_XML, 'Exponent')),
    d: b64ToUrl(xmlValue(BOT_RSA_PRIVATE_XML, 'D')),
    p: b64ToUrl(xmlValue(BOT_RSA_PRIVATE_XML, 'P')),
    q: b64ToUrl(xmlValue(BOT_RSA_PRIVATE_XML, 'Q')),
    dp: b64ToUrl(xmlValue(BOT_RSA_PRIVATE_XML, 'DP')),
    dq: b64ToUrl(xmlValue(BOT_RSA_PRIVATE_XML, 'DQ')),
    qi: b64ToUrl(xmlValue(BOT_RSA_PRIVATE_XML, 'InverseQ'))
  };

  cachedBotPrivateKey = crypto.createPrivateKey({ key: jwk, format: 'jwk' });
  return cachedBotPrivateKey;
}

function newBotLicenseKey(deviceId, planValue) {
  const device = String(deviceId || '').trim().toUpperCase();
  if (!device) throw new Error('Cole o ID do PC do cliente.');

  const plans = {
    daily: { days: 1, name: 'DIARIA' },
    weekly: { days: 7, name: 'SEMANAL' },
    monthly: { days: 30, name: 'MENSAL' }
  };
  const selected = plans[planValue] || plans.monthly;
  const expiry = Math.floor(Date.now() / 1000) + selected.days * 86400;
  const payload = `${device}|${expiry}|${selected.name}`;
  const payloadBytes = Buffer.from(payload, 'utf8');
  const signature = crypto.sign('RSA-SHA256', payloadBytes, getBotPrivateKey());
  return `${payloadBytes.toString('base64url')}.${signature.toString('base64url')}`;
}

async function readBody(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 20000) {
        reject(new Error('payload_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const type = String(req.headers['content-type'] || '');
        if (type.includes('application/json')) return resolve(data ? JSON.parse(data) : {});
        return resolve(querystring.parse(data));
      } catch {
        reject(new Error('invalid_payload'));
      }
    });
    req.on('error', reject);
  });
}

async function generateKeys(body) {
  const mode = String(body.mode || 'download').toLowerCase();

  if (mode === 'bot') {
    const key = newBotLicenseKey(body.deviceId, String(body.plan || 'monthly'));
    return {
      mode: 'bot',
      keys: [key],
      message: 'Key para liberar o app criada com sucesso. Ela é vinculada ao ID do PC informado.'
    };
  }

  const requested = Number.parseInt(body.count, 10);
  const count = [1, 5, 10].includes(requested) ? requested : 1;
  const label = String(body.label || '').trim().slice(0, 120) || 'Gerador Mobile';
  const keys = [];

  for (let i = 0; i < count; i += 1) {
    let created = false;
    for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
      const rawKey = newDownloadKey();
      try {
        await registerDownloadKey(rawKey, count > 1 ? `${label} ${i + 1}/${count}` : label);
        keys.push(rawKey);
        created = true;
      } catch (error) {
        if (String(error.kind || '').toLowerCase().includes('duplicate') && attempt < 2) continue;
        throw error;
      }
    }
  }

  return {
    mode: 'download',
    keys,
    message: `${keys.length} key(s) de download criada(s) e cadastrada(s) com sucesso.`
  };
}

function renderPage({ message = '', ok = false, keys = [], mode = 'download' } = {}) {
  const resultHtml = keys.length ? `
    <section class="result ${ok ? 'ok' : 'err'}">
      <strong>${escapeHtml(message)}</strong>
      <textarea id="resultKeys" readonly>${escapeHtml(keys.join('\n'))}</textarea>
      <button type="button" class="secondary" onclick="copyKeys()">COPIAR KEY(S)</button>
    </section>` : (message ? `<div class="message ${ok ? 'ok' : 'err'}">${escapeHtml(message)}</div>` : '');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#09090c">
<title>Gerador Mobile - Rico China</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#07070a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;min-height:100vh}main{max-width:620px;margin:0 auto;padding:24px 16px 44px}.brand{display:flex;align-items:center;gap:12px;margin-bottom:22px}.logo{width:48px;height:48px;border-radius:14px;background:linear-gradient(145deg,#ff243b,#79000d);display:grid;place-items:center;font-size:25px;font-weight:900;box-shadow:0 10px 35px #e0002440}.brand h1{font-size:21px;margin:0}.brand p{margin:4px 0 0;color:#9da0aa;font-size:13px}.card{background:linear-gradient(180deg,#111116,#09090d);border:1px solid #44131a;border-radius:20px;padding:18px;box-shadow:0 18px 55px #0009}.tag{display:inline-block;font-size:11px;font-weight:900;letter-spacing:1.4px;color:#ff6675;border:1px solid #6b1721;background:#19070a;padding:7px 10px;border-radius:999px;margin-bottom:15px}label{display:block;font-size:13px;color:#c7c7ce;margin:14px 0 7px}input,select,button,textarea{width:100%;border-radius:12px;font:inherit}input,select,textarea{background:#07070a;border:1px solid #34343d;color:#fff;padding:14px 13px;outline:none}textarea{min-height:120px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.45}input:focus,select:focus,textarea:focus{border-color:#e31d35;box-shadow:0 0 0 3px #e31d3520}button{border:0;padding:15px 14px;font-weight:900;cursor:pointer}.primary{margin-top:18px;background:linear-gradient(180deg,#ff2038,#cb001c);color:white}.secondary{margin-top:10px;background:#17171d;color:white;border:1px solid #363640}.hint{font-size:12px;color:#8f949e;line-height:1.5;margin-top:7px}.divider{height:1px;background:#25252d;margin:18px 0}.message,.result{margin-top:16px;border-radius:14px;padding:14px;font-size:13px}.message.ok,.result.ok{background:#07150d;border:1px solid #174f2c;color:#7af1a2}.message.err,.result.err{background:#1a090b;border:1px solid #641822;color:#ff7985}.result textarea{margin-top:12px}.footer{text-align:center;color:#666b76;font-size:11px;margin-top:18px}.mode-note{padding:12px;border-radius:12px;background:#0b0b10;border:1px solid #292932;color:#aeb2bc;font-size:12px;line-height:1.55;margin-top:10px}@media(max-width:420px){main{padding-left:13px;padding-right:13px}}
</style>
</head>
<body>
<main>
  <div class="brand"><div class="logo">R</div><div><h1>Rico China — Gerador Mobile</h1><p>DOWNLOAD + LIBERAÇÃO DO APP</p></div></div>
  <section class="card">
    <span class="tag">ACESSO ADMIN</span>
    <form method="post" action="/generate">
      <label for="pin">Senha do gerador</label>
      <input id="pin" name="pin" type="password" autocomplete="current-password" placeholder="Digite sua senha" required>

      <label for="mode">O que você quer gerar?</label>
      <select id="mode" name="mode" onchange="toggleMode()">
        <option value="download" ${mode === 'download' ? 'selected' : ''}>KEY PARA DOWNLOAD NO SITE</option>
        <option value="bot" ${mode === 'bot' ? 'selected' : ''}>KEY PARA LIBERAR APP JÁ BAIXADO</option>
      </select>

      <div id="downloadFields">
        <div class="mode-note">Use esta opção quando o cliente ainda vai baixar o Controle Rico pelo site. Cada key libera o download uma única vez.</div>
        <label for="label">Cliente / observação (opcional)</label>
        <input id="label" name="label" maxlength="120" placeholder="Ex.: João - Controle Rico">
        <label for="count">Quantidade</label>
        <select id="count" name="count"><option value="1">1 key</option><option value="5">5 keys</option><option value="10">10 keys</option></select>
      </div>

      <div id="botFields">
        <div class="mode-note">Use esta opção quando o cliente já baixou o app e precisa da key para liberar o uso. Você precisa do ID do PC dele.</div>
        <label for="deviceId">ID do PC do cliente</label>
        <input id="deviceId" name="deviceId" autocomplete="off" placeholder="Cole o ID que aparece no Controle Rico">
        <label for="plan">Validade</label>
        <select id="plan" name="plan"><option value="daily">Diária - 1 dia</option><option value="weekly">Semanal - 7 dias</option><option value="monthly" selected>Mensal - 30 dias</option></select>
      </div>

      <button class="primary" type="submit">GERAR KEY</button>
    </form>
    ${resultHtml}
  </section>
  <div class="footer">Controle Rico • acesso privado</div>
</main>
<script>
function toggleMode(){
  var mode=document.getElementById('mode').value;
  document.getElementById('downloadFields').style.display=mode==='download'?'block':'none';
  document.getElementById('botFields').style.display=mode==='bot'?'block':'none';
}
function copyKeys(){
  var el=document.getElementById('resultKeys');
  if(!el)return;
  el.focus();el.select();el.setSelectionRange(0,999999);
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(el.value).catch(function(){document.execCommand('copy')});}
  else{document.execCommand('copy');}
}
toggleMode();
</script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return sendHtml(res, renderPage());
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    try {
      if (!KEY_ADMIN_TOKEN || !MOBILE_KEY_PIN || !BOT_RSA_PRIVATE_XML) throw new Error('Configuração incompleta.');
      getBotPrivateKey();
      return sendJson(res, 200, { ok: true, service: 'controle-rico-mobile-keys', modes: ['download','bot'] });
    } catch (error) {
      console.error('Health mobile:', error.message);
      return sendJson(res, 503, { ok: false, service: 'controle-rico-mobile-keys' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/generate') {
    try {
      if (!KEY_ADMIN_TOKEN || !MOBILE_KEY_PIN || !BOT_RSA_PRIVATE_XML) {
        return sendHtml(res, renderPage({ message: 'Gerador ainda não configurado.', ok: false }), 503);
      }
      const body = await readBody(req);
      const auth = checkPin(req, body.pin);
      if (!auth.ok) return sendHtml(res, renderPage({ message: auth.message, ok: false, mode: body.mode }), auth.status);
      const result = await generateKeys(body);
      return sendHtml(res, renderPage({ message: result.message, ok: true, keys: result.keys, mode: result.mode }));
    } catch (error) {
      console.error('Erro ao gerar key mobile:', error);
      return sendHtml(res, renderPage({ message: error.message || 'Erro ao gerar key.', ok: false }), 500);
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/generate') {
    try {
      if (!KEY_ADMIN_TOKEN || !MOBILE_KEY_PIN || !BOT_RSA_PRIVATE_XML) {
        return sendJson(res, 503, { ok: false, message: 'Gerador ainda não configurado.' });
      }
      const body = await readBody(req);
      const suppliedPin = String(req.headers['x-admin-pin'] || body.pin || '').trim();
      const auth = checkPin(req, suppliedPin);
      if (!auth.ok) return sendJson(res, auth.status, { ok: false, message: auth.message });
      const result = await generateKeys(body);
      return sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      console.error('Erro API mobile:', error);
      return sendJson(res, 500, { ok: false, message: error.message || 'Erro ao gerar key.' });
    }
  }

  return sendJson(res, 404, { ok: false, message: 'Não encontrado.' });
});

server.listen(PORT, () => {
  console.log(`Gerador Mobile Rico online na porta ${PORT} - download + app`);
});