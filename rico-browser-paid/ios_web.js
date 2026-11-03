'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pricePage = path.join(__dirname, 'ios-landing.html');
const appPage = path.join(__dirname, 'ios-app.html');
const ENV = process.env.ASAAS_ENV === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const cookieName = 'rico_iphone_access';
const {verifyPurchaseProof}=require('./purchase_proof');
const {bindIphoneInstallation}=require('./device_bind');

function sign(data) {
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return body + '.' + sig;
}
function verify(token) {
  try {
    const chunks = String(token || '').split('.');
    if (chunks.length !== 2) return null;
    const sig = crypto.createHmac('sha256', secret).update(chunks[0]).digest('base64url');
    const a = Buffer.from(sig), b = Buffer.from(chunks[1]);
    if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return null;
    const val = JSON.parse(Buffer.from(chunks[0], 'base64url').toString('utf8'));
    const now = Date.now();
    if (!val.exp || val.exp <= now) return null;
    if (val.kind === 'iphone-paid') return val;
    const demoUntil = Date.parse(process.env.RICO_IPHONE_DEMO_UNTIL || '');
    if (val.kind === 'iphone-demo' && Number.isFinite(demoUntil) && demoUntil > now && val.exp <= demoUntil) return val;
    return null;
  } catch (_) { return null; }
}
function isValidDemoKey(candidate) {
  const expected = process.env.RICO_IPHONE_DEMO_KEY || '';
  const until = Date.parse(process.env.RICO_IPHONE_DEMO_UNTIL || '');
  if (!expected || !Number.isFinite(until) || Date.now() >= until) return false;
  if (typeof candidate !== 'string') return false;
  const actual = Buffer.from(candidate, 'utf8');
  const target = Buffer.from(expected, 'utf8');
  return actual.length === target.length && crypto.timingSafeEqual(actual, target);
}
function getCookie(req) {
  const cookie = String(req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='));
  return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : '';
}
function cleanId(input) {
  const id = String(input || '').trim();
  return id.length > 8 && id.length < 201 && /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
}
async function isPaid(checkoutId) {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error('asaas_missing');
  const response = await fetch(ENV + '/payments?checkoutSession=' + encodeURIComponent(checkoutId) + '&limit=100', {
    headers: { accept:'application/json', access_token:key, 'User-Agent':'RicoBrowserIOS/1.0' }
  });
  if (!response.ok) throw new Error('asaas_' + response.status);
  const result = await response.json();
  return Array.isArray(result.data) && result.data.some(p => p.checkoutSession === checkoutId && ['RECEIVED','CONFIRMED'].includes(p.status) && Number(p.value)>=69.98);
}
function registerIOSWeb(app) {
  if (app.__iosWebRegistered) return;
  app.__iosWebRegistered = true;
  app.get('/iphone', (req,res) => res.set('Cache-Control','no-store').type('html').send(fs.readFileSync(pricePage,'utf8')));
  app.get('/iphone/app', (req,res) => {
    const session = verify(getCookie(req));
    if (!session) return res.redirect(302,'/iphone');
    let html = fs.readFileSync(appPage, 'utf8');
    if (session.kind === 'iphone-demo') {
      html = html.replace('ACESSO ATIVO', 'MODO TESTE');
      html = html.replace('Seu acesso foi confirmado pelo Asaas. A sessão neste dispositivo é renovável usando o código da compra salvo no navegador.',
        'Você está usando uma chave temporária de demonstração. Nenhum pagamento foi realizado. Esse acesso não libera o APK Android.');
    }
    return res.set('Cache-Control','no-store').type('html').send(html);
  });
  app.get('/iphone/manifest.webmanifest', (req,res) => res.type('application/manifest+json').send({
    id:'/iphone/', name:'Rico Browser — iPhone Beta', short_name:'Rico Browser',
    start_url:'/iphone', scope:'/iphone', display:'standalone',
    background_color:'#080e19', theme_color:'#080e19',
    icons:[{src:'/iphone/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]
  }));
  app.get('/iphone/icon.svg', (req,res) => res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="44" fill="#0a1326"/><rect x="38" y="22" width="116" height="148" rx="20" fill="none" stroke="#7cc5ff" stroke-width="12"/><path d="M73 140h46" stroke="#7cc5ff" stroke-width="10" stroke-linecap="round"/><text x="96" y="103" fill="white" font-family="Arial" text-anchor="middle" font-size="49" font-weight="bold">R</text></svg>'));
  app.get('/iphone/sw.js', (req,res) => res.set('Cache-Control','no-store').type('application/javascript').send('self.addEventListener("install",e=>self.skipWaiting());self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));'));
  app.post('/iphone/activate', async (req,res) => {
    res.set('Cache-Control','no-store');
    const supplied = req.body && req.body.purchaseProof;
    const installationId = req.body && req.body.installationId;
    if (isValidDemoKey(supplied)) {
      try {
        const demoAccessId = 'demo_' + crypto.createHash('sha256').update(supplied).digest('hex');
        if (!(await bindIphoneInstallation(demoAccessId, installationId))) {
          return res.status(409).json({ok:false,error:'Esta chave de teste já foi ativada em outro dispositivo.'});
        }
      } catch(e) {
        console.error('iphone_demo_binding',e.message);
        return res.status(503).json({ok:false,error:'Não foi possível verificar este dispositivo. Use a versão instalada no iPhone.'});
      }
      const until = Date.parse(process.env.RICO_IPHONE_DEMO_UNTIL);
      const now = Date.now();
      const exp = Math.min(now + 4*60*60*1000, until);
      res.cookie(cookieName, sign({kind:'iphone-demo',exp}), {
        httpOnly:true,secure:true,sameSite:'lax',path:'/iphone',maxAge:exp-now
      });
      return res.json({ok:true,go:'/iphone/app',demo:true});
    }
    const id = verifyPurchaseProof(supplied);
    if (!id) return res.status(400).json({ok:false,error:'Chave de acesso inválida. Conclua uma compra ou contate o suporte com o comprovante.'});
    try {
      if (!(await isPaid(id))) return res.status(403).json({ok:false,error:'Pagamento ainda não confirmado. Confira seu Pix.'});
      if (!(await bindIphoneInstallation('paid_' + id, installationId))) {
        return res.status(409).json({ok:false,error:'Esta chave já está vinculada a outro dispositivo. Entre em contato com o suporte para solicitar uma troca.'});
      }
      const days = 90, maxAge = days*86400*1000;
      res.cookie(cookieName, sign({kind:'iphone-paid',checkoutId:id,exp:Date.now()+maxAge}), {
        httpOnly:true,secure:true,sameSite:'lax',path:'/iphone',maxAge
      });
      return res.json({ok:true,go:'/iphone/app'});
    } catch (e) {
      console.error('iphone_activation_error',e.message);
      return res.status(502).json({ok:false,error:'Não foi possível verificar a compra ou o dispositivo agora.'});
    }
  });
  app.post('/iphone/logout', (req,res) => {res.clearCookie(cookieName,{path:'/iphone'});res.json({ok:true});});
}
module.exports = {registerIOSWeb};