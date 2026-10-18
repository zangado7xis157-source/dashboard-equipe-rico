const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = 'https://ytjwwgskilygayjrycfk.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0and3Z3NraWx5Z2F5anJ5Y2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NzM4NTUsImV4cCI6MjEwNjU0OTg1NX0.avTRZstKk41cVH9oQAqXxdPVw8Q6jv9ARXabuK_4HrM';
const KEY_ADMIN_TOKEN = process.env.KEY_ADMIN_TOKEN || '';
const MOBILE_KEY_PIN = process.env.MOBILE_KEY_PIN || '';

const failedAuth = new Map();
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 8;

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

function sendHtml(res, html) {
  const body = Buffer.from(html, 'utf8');
  res.writeHead(200, {
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

function checkPin(req) {
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

  const supplied = String(req.headers['x-admin-pin'] || '').trim();
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
    throw new Error('Falha ao cadastrar a key.');
  }

  let result;
  try { result = JSON.parse(text); } catch { result = null; }
  if (!result || result.ok !== true) {
    console.error('Supabase RPC result', text);
    const err = new Error('Falha ao cadastrar a key.');
    err.kind = result?.kind || result?.message || 'unknown';
    throw err;
  }
  return result;
}

async function readJson(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 10000) {
        reject(new Error('payload_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}

const PAGE = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#09090c">
<title>Gerador Mobile - Rico China</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#07070a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;min-height:100vh}main{max-width:560px;margin:0 auto;padding:24px 18px 44px}.brand{display:flex;align-items:center;gap:12px;margin-bottom:22px}.logo{width:48px;height:48px;border-radius:14px;background:linear-gradient(145deg,#ff243b,#79000d);display:grid;place-items:center;font-size:25px;font-weight:900;box-shadow:0 10px 35px #e0002440}.brand h1{font-size:21px;margin:0}.brand p{margin:4px 0 0;color:#9da0aa;font-size:13px}.card{background:linear-gradient(180deg,#111116,#09090d);border:1px solid #44131a;border-radius:20px;padding:18px;box-shadow:0 18px 55px #0009}.tag{display:inline-block;font-size:11px;font-weight:900;letter-spacing:1.4px;color:#ff6675;border:1px solid #6b1721;background:#19070a;padding:7px 10px;border-radius:999px;margin-bottom:15px}label{display:block;font-size:13px;color:#c7c7ce;margin:14px 0 7px}input,select,button{width:100%;border-radius:12px;font:inherit}input,select{background:#07070a;border:1px solid #34343d;color:#fff;padding:14px 13px;outline:none}input:focus,select:focus{border-color:#e31d35;box-shadow:0 0 0 3px #e31d3520}button{border:0;padding:15px 14px;font-weight:900;cursor:pointer}.primary{margin-top:16px;background:linear-gradient(180deg,#ff2038,#cb001c);color:white}.secondary{margin-top:10px;background:#17171d;color:white;border:1px solid #363640}.remember{display:flex;align-items:center;gap:9px;color:#aaaeb7;font-size:13px;margin-top:12px}.remember input{width:18px;height:18px;margin:0}.status{min-height:22px;margin:13px 2px 0;font-size:13px;color:#aeb2bc}.status.ok{color:#5ce58a}.status.err{color:#ff6070}.keys{margin-top:16px;display:grid;gap:9px}.key{background:#050507;border:1px solid #292931;border-radius:12px;padding:13px;word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:#fff}.note{margin-top:17px;color:#9296a0;font-size:12px;line-height:1.55}.footer{text-align:center;color:#666b76;font-size:11px;margin-top:18px}@media(max-width:420px){main{padding-left:13px;padding-right:13px}}
</style>
</head>
<body>
<main>
  <div class="brand"><div class="logo">R</div><div><h1>Rico China — Gerador Mobile</h1><p>KEY DOWNLOAD SITE</p></div></div>
  <section class="card">
    <span class="tag">ACESSO ADMIN</span>
    <label for="pin">Senha do gerador</label>
    <input id="pin" type="password" autocomplete="current-password" placeholder="Digite sua senha">
    <div class="remember"><input id="remember" type="checkbox"><span>Lembrar neste celular</span></div>

    <label for="label">Cliente / observação (opcional)</label>
    <input id="label" maxlength="120" placeholder="Ex.: João - VIP mensal">

    <label for="count">Quantidade de keys</label>
    <select id="count"><option value="1">1 key</option><option value="5">5 keys</option><option value="10">10 keys</option></select>

    <button class="primary" id="generate">GERAR KEY(S) DE DOWNLOAD</button>
    <button class="secondary" id="copy" style="display:none">COPIAR TODAS</button>
    <div id="status" class="status"></div>
    <div id="keys" class="keys"></div>
    <div class="note">Cada key é cadastrada no mesmo sistema do PC e libera o download uma única vez. O gerador mobile não altera o site principal nem o bot.</div>
  </section>
  <div class="footer">Controle Rico • acesso privado</div>
</main>
<script>
const pin = document.getElementById('pin');
const remember = document.getElementById('remember');
const label = document.getElementById('label');
const count = document.getElementById('count');
const generate = document.getElementById('generate');
const copy = document.getElementById('copy');
const status = document.getElementById('status');
const keysBox = document.getElementById('keys');
let lastKeys = [];
const saved = localStorage.getItem('rico_mobile_pin');
if(saved){pin.value=saved;remember.checked=true}
remember.addEventListener('change',()=>{if(!remember.checked)localStorage.removeItem('rico_mobile_pin')});
function setStatus(text, kind=''){status.textContent=text;status.className='status '+kind}
generate.addEventListener('click', async()=>{
  const p = pin.value.trim();
  if(!p){setStatus('Digite a senha do gerador.','err');return}
  generate.disabled=true;generate.textContent='GERANDO...';copy.style.display='none';keysBox.innerHTML='';lastKeys=[];
  try{
    const r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Pin':p},body:JSON.stringify({label:label.value.trim(),count:Number(count.value)})});
    const data=await r.json().catch(()=>({ok:false,message:'Resposta inválida do servidor.'}));
    if(!r.ok||!data.ok)throw new Error(data.message||'Não foi possível gerar a key.');
    lastKeys=data.keys||[];
    keysBox.innerHTML=lastKeys.map(k=>'<div class="key">'+k.replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))+'</div>').join('');
    copy.style.display=lastKeys.length?'block':'none';
    if(remember.checked)localStorage.setItem('rico_mobile_pin',p);else localStorage.removeItem('rico_mobile_pin');
    setStatus(lastKeys.length+' key(s) criada(s) e cadastrada(s) com sucesso.','ok');
  }catch(e){setStatus(e.message||'Erro ao gerar key.','err')}
  finally{generate.disabled=false;generate.textContent='GERAR KEY(S) DE DOWNLOAD'}
});
copy.addEventListener('click',async()=>{
  if(!lastKeys.length)return;
  try{await navigator.clipboard.writeText(lastKeys.join('\n'));setStatus('Keys copiadas.','ok')}
  catch{setStatus('Não foi possível copiar automaticamente. Segure sobre a key para copiar.','err')}
});
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return sendHtml(res, PAGE);
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, KEY_ADMIN_TOKEN && MOBILE_KEY_PIN ? 200 : 503, {
      ok: Boolean(KEY_ADMIN_TOKEN && MOBILE_KEY_PIN),
      service: 'controle-rico-mobile-keys'
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/generate') {
    if (!KEY_ADMIN_TOKEN || !MOBILE_KEY_PIN) {
      return sendJson(res, 503, { ok: false, message: 'Gerador ainda não configurado.' });
    }

    const auth = checkPin(req);
    if (!auth.ok) return sendJson(res, auth.status, { ok: false, message: auth.message });

    try {
      const body = await readJson(req);
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

      return sendJson(res, 200, { ok: true, keys, single_use: true });
    } catch (error) {
      console.error('Erro ao gerar key mobile:', error);
      return sendJson(res, 500, { ok: false, message: 'Erro ao cadastrar a key. Tente novamente.' });
    }
  }

  return sendJson(res, 404, { ok: false, message: 'Não encontrado.' });
});

server.listen(PORT, () => {
  console.log(`Gerador Mobile Rico online na porta ${PORT}`);
});
