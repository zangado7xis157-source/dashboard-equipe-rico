const webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const subscriptions = new Map();
const sentPayments = new Set();

function addSubscription(sub) {
  if (!sub || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw new Error('Assinatura push inválida');
  }
  subscriptions.set(sub.endpoint, {
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime || null,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }
  });
}

function loadPersistedSubscriptions() {
  const raw = process.env.PUSH_SUBSCRIPTION_JSON;
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const sub of list) addSubscription(sub);
    console.log(`push_subscriptions_loaded ${subscriptions.size}`);
  } catch (e) {
    console.error('push_subscription_env_error', e.message);
  }
}

loadPersistedSubscriptions();

function registerPushRoutes(app) {
  app.get('/push/', (req, res) => {
    res.type('html').send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07101f"><link rel="manifest" href="/push/manifest.webmanifest"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Vendas Rico"><title>Notificações de Vendas</title><style>*{box-sizing:border-box}body{margin:0;background:#050914;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(520px,100%);background:#0c1628;border:1px solid #1f3860;border-radius:24px;padding:28px;box-shadow:0 25px 80px #0008}h1{font-size:30px;margin:0 0 12px}.muted{color:#9eb0ca;line-height:1.55}.btn{width:100%;border:0;border-radius:15px;padding:17px;background:#1677ff;color:#fff;font-weight:900;font-size:16px;margin-top:18px}.ok{color:#5be59a;font-weight:800}.warn{color:#ffd166}.steps{background:#08101d;border:1px solid #1b2c49;border-radius:16px;padding:16px;margin-top:18px;font-size:14px;line-height:1.55}.small{font-size:12px;color:#71819a;margin-top:14px}</style></head><body><main class="card"><h1>💰 Notificações de vendas</h1><p class="muted">Receba no celular uma notificação sempre que o Asaas confirmar uma venda, inclusive de cliente novo.</p><button id="btn" class="btn">ATIVAR NOTIFICAÇÕES</button><p id="msg" class="muted"></p><div class="steps"><b>No iPhone:</b><br>1. Abra esta página no Safari.<br>2. Toque em Compartilhar.<br>3. Escolha <b>Adicionar à Tela de Início</b>.<br>4. Abra pelo ícone criado.<br>5. Toque em <b>ATIVAR NOTIFICAÇÕES</b>.</div><p class="small">Depois de ativado, você não precisa configurar cliente por cliente.</p><script>
const pub=${JSON.stringify(VAPID_PUBLIC_KEY)},btn=document.getElementById('btn'),msg=document.getElementById('msg');
function b64(s){const p='='.repeat((4-s.length%4)%4);const b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...b].map(c=>c.charCodeAt(0)))}
async function current(){if(!('serviceWorker'in navigator)){msg.innerHTML='<span class="warn">No iPhone, adicione à Tela de Início e abra pelo ícone.</span>';return}const r=await navigator.serviceWorker.getRegistration('/push/');if(r){const s=await r.pushManager.getSubscription();if(s){msg.innerHTML='<span class="ok">✓ Notificações já estão ativadas neste aparelho.</span>';btn.textContent='NOTIFICAÇÕES ATIVADAS'}}}
btn.onclick=async()=>{try{if(!pub)throw new Error('Push ainda não configurado no servidor.');if(!('Notification'in window))throw new Error('No iPhone, primeiro adicione esta página à Tela de Início e abra pelo ícone.');const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('Permissão de notificações não foi liberada.');const reg=await navigator.serviceWorker.register('/push/sw.js',{scope:'/push/'});await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(pub)});const r=await fetch('/push/subscribe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(sub)});if(!r.ok)throw new Error('Não consegui salvar este aparelho.');await reg.showNotification('Notificações ativadas ✅',{body:'Você receberá uma notificação quando uma venda for confirmada.'});msg.innerHTML='<span class="ok">✓ Pronto! Este celular receberá as vendas confirmadas.</span>';btn.textContent='NOTIFICAÇÕES ATIVADAS'}catch(e){msg.innerHTML='<span class="warn">'+e.message+'</span>'}};current();
</script></main></body></html>`);
  });

  app.get('/push/manifest.webmanifest', (req, res) => {
    res.type('application/manifest+json').send(JSON.stringify({
      name: 'Notificações de Vendas Rico',
      short_name: 'Vendas Rico',
      start_url: '/push/',
      scope: '/push/',
      display: 'standalone',
      background_color: '#050914',
      theme_color: '#07101f'
    }));
  });

  app.get('/push/sw.js', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.type('application/javascript').send(`self.addEventListener('push',e=>{let d={title:'💰 Venda confirmada',body:'Uma nova venda foi confirmada.'};try{d={...d,...e.data.json()}}catch{}e.waitUntil(self.registration.showNotification(d.title,{body:d.body,tag:d.tag||'sale',data:{url:d.url||'/push/'}}))});self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{if(ws[0])return ws[0].focus();return clients.openWindow(e.notification.data?.url||'/push/')}))});`);
  });

  app.post('/push/subscribe', (req, res) => {
    try {
      addSubscription(req.body);
      const encoded = Buffer.from(JSON.stringify(req.body)).toString('base64url');
      console.log('push_subscription_saved', encoded);
      res.json({ ok: true });
    } catch (e) {
      console.error('push_subscribe_error', e.message);
      res.status(400).json({ ok: false });
    }
  });
}

async function notifySaleFromAsaas(evt) {
  const event = String(evt?.event || '');
  if (!['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event)) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const payment = evt?.payment || {};
  const paymentId = String(payment.id || '');
  if (!paymentId || sentPayments.has(paymentId)) return;
  sentPayments.add(paymentId);
  setTimeout(() => sentPayments.delete(paymentId), 24 * 60 * 60 * 1000).unref?.();

  const value = Number(payment.value || 0);
  const formatted = value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const methods = { PIX: 'Pix', CREDIT_CARD: 'Cartão', BOLETO: 'Boleto', UNDEFINED: 'Pagamento' };
  const method = methods[String(payment.billingType || '')] || String(payment.billingType || 'Pagamento');
  const description = String(payment.description || '').trim();
  const body = description ? `${formatted} • ${method} • ${description}` : `${formatted} • ${method}`;
  const payload = JSON.stringify({ title: '💰 Venda confirmada', body, tag: `sale-${paymentId}`, url: '/push/' });

  for (const [endpoint, sub] of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 3600 });
    } catch (e) {
      if ([404, 410].includes(Number(e.statusCode))) subscriptions.delete(endpoint);
      else console.error('push_send_error', e.statusCode || '', e.message || e);
    }
  }
}

module.exports = { registerPushRoutes, notifySaleFromAsaas };
