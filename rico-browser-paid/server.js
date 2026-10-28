const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

const PORT = process.env.PORT || 10000;
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_ENV = process.env.ASAAS_ENV === 'sandbox' ? 'sandbox' : 'production';
const ASAAS_BASE = ASAAS_ENV === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || '';
const PRICE = 69.99;
const OLD_PRICE = 130.99;
const APK_PATH = path.join(__dirname, 'private', 'RicoBrowserMobile.apk');
const paidCache = new Set();

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verify(token, kind) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.kind !== kind || !data.exp || Date.now() > data.exp) return null;
    return data;
  } catch { return null; }
}

async function asaas(url, options = {}) {
  const response = await fetch(`${ASAAS_BASE}${url}`, {
    ...options,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'User-Agent': 'RicoBrowserMobile/1.0',
      access_token: ASAAS_API_KEY,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) {
    const err = new Error(`Asaas ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function checkoutWasPaid(checkoutId) {
  if (paidCache.has(checkoutId)) return true;
  const result = await asaas(`/payments?checkoutSession=${encodeURIComponent(checkoutId)}&limit=100`, {
    method: 'GET',
    headers: {'content-type':'application/json'}
  });
  const payments = Array.isArray(result.data) ? result.data : [];
  const paid = payments.some(p => ['RECEIVED','CONFIRMED'].includes(p.status));
  if (paid) paidCache.add(checkoutId);
  return paid;
}

function pageHtml() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rico Browser Mobile — Android</title><meta name="theme-color" content="#07090d"><style>
*{box-sizing:border-box}body{margin:0;background:#07090d;color:#fff;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:22px}.wrap{width:min(960px,100%)}.card{border:1px solid #252a35;background:linear-gradient(180deg,#121722,#0b0e14);border-radius:28px;padding:34px;box-shadow:0 30px 90px #0009}.top{display:flex;gap:10px;flex-wrap:wrap}.tag{border:1px solid #343b49;border-radius:999px;padding:8px 12px;color:#cbd3df;font-size:12px;font-weight:800}.android{background:#fff;color:#080a0d}.hero{display:grid;grid-template-columns:1.25fr .75fr;gap:28px;margin-top:26px}.hero h1{font-size:clamp(38px,7vw,72px);line-height:.96;letter-spacing:-2.5px;margin:0 0 18px}.lead{color:#aab4c2;line-height:1.6;font-size:17px;max-width:620px}.offer{background:#0a0d13;border:1px solid #2d3543;border-radius:22px;padding:24px}.offer small{color:#8e9aad}.old{font-size:20px;color:#7f8998;text-decoration:line-through;margin-top:8px}.today{font-weight:900;margin-top:8px;font-size:14px}.price{font-size:52px;font-weight:950;letter-spacing:-2px;margin:3px 0 4px}.life{font-size:13px;color:#aab4c2;margin-bottom:20px}.btn{display:flex;width:100%;border:0;border-radius:15px;padding:16px 18px;align-items:center;justify-content:center;background:#fff;color:#090b0f;font-weight:950;font-size:15px;cursor:pointer}.btn:disabled{opacity:.55;cursor:wait}.btn.secondary{display:none;margin-top:10px;background:#151a23;color:#fff;border:1px solid #303846}.msg{margin-top:12px;color:#aab4c2;font-size:13px;line-height:1.4}.benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:22px}.b{background:#0a0d13;border:1px solid #252b36;border-radius:16px;padding:16px}.b strong{display:block;margin-bottom:4px}.b span{font-size:13px;color:#8f99a8}.fine{margin-top:20px;text-align:center;color:#66707e;font-size:11px}@media(max-width:760px){.card{padding:24px}.hero{grid-template-columns:1fr}.benefits{grid-template-columns:1fr}.hero h1{letter-spacing:-1.5px}}
</style></head><body><main class="wrap"><section class="card"><div class="top"><span class="tag android">ANDROID</span><span class="tag">ACESSO VITALÍCIO</span><span class="tag">PAGAMENTO SEGURO ASAAS</span></div><div class="hero"><div><h1>Rico Browser<br>Mobile.</h1><p class="lead">Navegador mobile para Android com perfis separados, proxy e recursos do aplicativo em um único lugar. Após a confirmação do pagamento, o download é liberado automaticamente.</p><div class="benefits"><div class="b"><strong>✓ Vitalício</strong><span>Pagamento único.</span></div><div class="b"><strong>✓ Android</strong><span>Download do APK.</span></div><div class="b"><strong>✓ Atualizações</strong><span>Quem já comprou não paga novamente.</span></div></div></div><aside class="offer"><small>VALOR NORMAL</small><div class="old">R$ ${OLD_PRICE.toFixed(2).replace('.', ',')}</div><div class="today">OFERTA DE HOJE</div><div class="price">R$ ${PRICE.toFixed(2).replace('.', ',')}</div><div class="life">Acesso vitalício • pagamento único via Pix</div><button id="buy" class="btn">LIBERAR ACESSO AGORA</button><button id="update" class="btn secondary">JÁ COMPREI / BAIXAR ATUALIZAÇÃO</button><div id="msg" class="msg">Você será direcionado ao checkout seguro do Asaas.</div></aside></div><div class="fine">Produto digital para Android. O download é liberado após confirmação financeira.</div></section></main><script>
const btn=document.getElementById('buy'),upd=document.getElementById('update'),msg=document.getElementById('msg');
const savedCheckout=localStorage.getItem('rico_checkout_id');
if(savedCheckout){upd.style.display='flex'}
btn.onclick=async()=>{btn.disabled=true;msg.textContent='Gerando pagamento seguro…';try{const r=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Não foi possível iniciar o pagamento.');localStorage.setItem('rico_access_token',d.accessToken);localStorage.setItem('rico_checkout_id',d.checkoutId);location.href=d.checkoutUrl}catch(e){msg.textContent=e.message;btn.disabled=false}};
upd.onclick=async()=>{const checkoutId=localStorage.getItem('rico_checkout_id');if(!checkoutId){msg.textContent='Compra anterior não encontrada neste navegador.';return}upd.disabled=true;msg.textContent='Conferindo sua compra anterior…';try{const r=await fetch('/api/recover',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({checkoutId})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Não foi possível validar sua compra.');msg.textContent='Compra confirmada ✓ Iniciando atualização…';location.href=d.downloadUrl;setTimeout(()=>{upd.disabled=false},3000)}catch(e){msg.textContent=e.message;upd.disabled=false}};
</script></body></html>`;
}

function returnHtml() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirmando pagamento</title><style>body{margin:0;background:#080a0e;color:#fff;font-family:system-ui;min-height:100vh;display:grid;place-items:center;padding:20px}.c{width:min(520px,100%);padding:30px;border:1px solid #29303c;border-radius:22px;background:#10141c;text-align:center}h1{margin-top:0}.s{color:#aeb7c4;line-height:1.5}.download{display:none;margin-top:20px;text-decoration:none;background:#fff;color:#080a0e;padding:15px 18px;border-radius:13px;font-weight:900}.home{display:block;margin-top:18px;color:#8995a5}</style></head><body><div class="c"><h1 id="title">Confirmando pagamento…</h1><p id="status" class="s">Assim que o Asaas confirmar, o download será liberado nesta tela.</p><a id="download" class="download">BAIXAR RICO BROWSER — ANDROID</a><a class="home" href="/">Voltar ao início</a></div><script>
const token=localStorage.getItem('rico_access_token');const title=document.getElementById('title'),status=document.getElementById('status'),dl=document.getElementById('download');let tries=0;
async function check(){if(!token){title.textContent='Sessão não encontrada';status.textContent='Volte à página inicial. Se você já comprou, use “Já comprei / Baixar atualização”.';return}tries++;try{const r=await fetch('/api/status',{headers:{authorization:'Bearer '+token}});const d=await r.json();if(d.paid&&d.downloadUrl){title.textContent='Pagamento confirmado ✓';status.textContent='Seu acesso vitalício foi liberado. Toque abaixo para baixar.';dl.href=d.downloadUrl;dl.style.display='inline-block';localStorage.removeItem('rico_access_token');return}if(tries<100)setTimeout(check,3000);else{title.textContent='Ainda aguardando confirmação';status.textContent='O pagamento pode levar alguns instantes para aparecer. Reabra esta página depois do pagamento.'}}catch(e){setTimeout(check,4000)}}check();
</script></body></html>`;
}

app.get('/', (req,res)=>res.type('html').send(pageHtml()));
app.get('/retorno', (req,res)=>res.type('html').send(returnHtml()));
app.get('/health', (req,res)=>res.json({ok:true,asaasConfigured:Boolean(ASAAS_API_KEY),apk:fs.existsSync(APK_PATH)}));

app.post('/api/checkout', async (req,res) => {
  if (!ASAAS_API_KEY) return res.status(503).json({error:'Pagamento em configuração. Tente novamente em breve.'});
  if (!PUBLIC_URL) return res.status(503).json({error:'Configuração do site incompleta.'});
  try {
    const orderId = crypto.randomUUID();
    const checkout = await asaas('/checkouts', {method:'POST',body:JSON.stringify({
      billingTypes:['PIX'],
      chargeTypes:['DETACHED'],
      minutesToExpire:60,
      externalReference:orderId,
      callback:{successUrl:`${PUBLIC_URL}/retorno`,cancelUrl:`${PUBLIC_URL}/?status=cancelado`,expiredUrl:`${PUBLIC_URL}/?status=expirado`},
      items:[{name:'Rico Browser Mobile — Acesso Vitalício',description:'Licença vitalícia para Android',quantity:1,value:PRICE}]
    })});
    if (!checkout.id) throw new Error('Checkout sem identificador');
    const accessToken = sign({kind:'checkout',checkoutId:checkout.id,orderId,exp:Date.now()+2*60*60*1000});
    res.json({checkoutId:checkout.id,accessToken,checkoutUrl:`https://asaas.com/checkoutSession/show?id=${encodeURIComponent(checkout.id)}`});
  } catch (e) {
    console.error('checkout_error', e.status || '', e.data || e.message);
    res.status(502).json({error:'Não foi possível gerar o pagamento agora.'});
  }
});

app.get('/api/status', async (req,res) => {
  if (!ASAAS_API_KEY) return res.status(503).json({error:'Pagamento em configuração.'});
  const auth = req.headers.authorization || '';
  const data = verify(auth.replace(/^Bearer\s+/i,''), 'checkout');
  if (!data) return res.status(401).json({error:'Sessão inválida ou expirada.'});
  try {
    const paid = await checkoutWasPaid(data.checkoutId);
    if (!paid) return res.json({paid:false});
    const dlToken = sign({kind:'download',checkoutId:data.checkoutId,exp:Date.now()+15*60*1000});
    res.json({paid:true,downloadUrl:`/download?token=${encodeURIComponent(dlToken)}`});
  } catch (e) {
    console.error('status_error', e.status || '', e.data || e.message);
    res.status(502).json({error:'Não foi possível confirmar o pagamento neste momento.'});
  }
});

app.post('/api/recover', async (req,res) => {
  if (!ASAAS_API_KEY) return res.status(503).json({error:'Pagamento em configuração.'});
  const checkoutId = String(req.body && req.body.checkoutId || '').trim();
  if (!checkoutId || checkoutId.length > 200 || !/^[A-Za-z0-9_-]+$/.test(checkoutId)) {
    return res.status(400).json({error:'Compra anterior inválida.'});
  }
  try {
    const paid = await checkoutWasPaid(checkoutId);
    if (!paid) return res.status(403).json({error:'Não encontrei pagamento confirmado para esta compra.'});
    const dlToken = sign({kind:'download',checkoutId,exp:Date.now()+15*60*1000});
    res.json({paid:true,downloadUrl:`/download?token=${encodeURIComponent(dlToken)}`});
  } catch (e) {
    console.error('recover_error', e.status || '', e.data || e.message);
    res.status(502).json({error:'Não foi possível validar sua compra agora.'});
  }
});

app.post('/webhook/asaas', (req,res) => {
  if (!WEBHOOK_TOKEN || req.headers['asaas-access-token'] !== WEBHOOK_TOKEN) return res.status(401).json({ok:false});
  const evt = req.body || {};
  const checkoutId = evt.checkout && evt.checkout.id;
  if (evt.event === 'CHECKOUT_PAID' && checkoutId) paidCache.add(checkoutId);
  res.status(200).json({ok:true});
});

app.get('/download', (req,res) => {
  const data = verify(req.query.token, 'download');
  if (!data) return res.status(401).send('Link de download inválido ou expirado.');
  if (!fs.existsSync(APK_PATH)) return res.status(503).send('APK temporariamente indisponível.');
  res.download(APK_PATH, 'RicoBrowserMobile-Android.apk');
});

app.listen(PORT, () => console.log(`Rico Browser Paid ativo na porta ${PORT}`));
