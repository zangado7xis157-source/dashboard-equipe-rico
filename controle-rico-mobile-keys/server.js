const http = require('http');
const crypto = require('crypto');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = 'https://ytjwwgskilygayjrycfk.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJ5dGp3d2dza2lseWdheWpyeWNmayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzkwOTczODU1LCJleHAiOjIxMDY1NDk4NTV9.avTRZstKk41cVH9oQAqXxdPVw8Q6jv9ARXabuK_4HrM';
const KEY_ADMIN_TOKEN = process.env.KEY_ADMIN_TOKEN || '';
const MOBILE_KEY_PIN = process.env.MOBILE_KEY_PIN || '';

const failedAuth = new Map();
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 8;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
function sendJson(res,status,data){
  const body=Buffer.from(JSON.stringify(data));
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
  res.end(body);
}
function sendHtml(res,html,status=200){
  const body=Buffer.from(html,'utf8');
  res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store','X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'"});
  res.end(body);
}
function safeEqual(a,b){const aa=Buffer.from(String(a||''),'utf8');const bb=Buffer.from(String(b||''),'utf8');if(aa.length!==bb.length||aa.length===0)return false;return crypto.timingSafeEqual(aa,bb)}
function clientIp(req){const f=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();return f||req.socket.remoteAddress||'unknown'}
function checkPin(req,pin){
  const ip=clientIp(req),now=Date.now();let s=failedAuth.get(ip);
  if(s&&now-s.first>FAIL_WINDOW_MS){failedAuth.delete(ip);s=null}
  if(s&&s.count>=MAX_FAILS)return{ok:false,status:429,message:'Muitas tentativas. Aguarde alguns minutos.'};
  if(!safeEqual(String(pin||'').trim(),MOBILE_KEY_PIN)){if(!s)s={count:0,first:now};s.count++;failedAuth.set(ip,s);return{ok:false,status:401,message:'Senha incorreta.'}}
  failedAuth.delete(ip);return{ok:true};
}
function randomChars(n){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<n;i++)s+=alphabet[crypto.randomInt(0,alphabet.length)];return s}
function grouped(prefix,n=20){const r=randomChars(n),parts=[];for(let i=0;i<n;i+=4)parts.push(r.slice(i,i+4));return `${prefix}-${parts.join('-')}`}
function newDownloadKey(){return grouped('DOWNLOAD-RICO',20)}
function newDashboardKey(){return grouped('RICO',24)}
function newOperationalKey(){return grouped('VIP-RICO',20)}
function newBotKey(){return grouped('BOT-RICO',16)}
function newBetaKey(){return grouped('BOT-BETA-RICO',16)}
function sha256(text){return crypto.createHash('sha256').update(String(text),'utf8').digest('hex')}

async function rpcRaw(name,payload){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:SUPABASE_ANON,Authorization:`Bearer ${SUPABASE_ANON}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const text=await response.text();
  let result=null;try{result=JSON.parse(text)}catch{}
  if(!response.ok){console.error(name,response.status,text);throw new Error('Serviço de keys indisponível.');}
  return result;
}
async function callRpc(name,payload){
  const result=await rpcRaw(name,payload);
  if(!result||result.ok!==true){const e=new Error(result?.message||'Falha ao cadastrar a key.');e.kind=result?.message||'unknown';throw e}
  return result;
}
async function registerDownloadKey(raw,label){return callRpc('create_controle_rico_download_key',{p_admin_token:KEY_ADMIN_TOKEN,p_key_hash:sha256(raw),p_label:label||null})}
async function registerDashboardKey(raw,kind,label){return callRpc('create_cpa_admin_key',{p_admin_token:KEY_ADMIN_TOKEN,p_key_hash:sha256(raw),p_kind:kind,p_label:label||null})}
async function registerOperationalKey(raw,kind,label){return callRpc('create_operacional_equipe_rico_key',{p_admin_token:KEY_ADMIN_TOKEN,p_key_hash:sha256(raw),p_kind:kind,p_label:label||null})}
async function registerBotKey(raw,deviceId,plan,label){return callRpc('create_controle_rico_bot_key',{p_admin_token:KEY_ADMIN_TOKEN,p_key_hash:sha256(raw),p_device_id:String(deviceId||'').trim().toUpperCase(),p_plan:plan,p_label:label||null})}
async function registerBetaKey(raw,plan,label){return callRpc('create_equipe_rico_beta_key',{p_admin_token:KEY_ADMIN_TOKEN,p_key_hash:sha256(raw),p_plan:plan,p_label:label||null})}

async function readBody(req){return new Promise((resolve,reject)=>{let data='';req.on('data',c=>{data+=c;if(data.length>30000){reject(new Error('payload_too_large'));req.destroy()}});req.on('end',()=>{try{const t=String(req.headers['content-type']||'');resolve(t.includes('application/json')?(data?JSON.parse(data):{}):querystring.parse(data))}catch{reject(new Error('invalid_payload'))}});req.on('error',reject)})}

async function generateKeys(body){
  const mode=String(body.mode||'download').toLowerCase();
  const label=String(body.label||'').trim().slice(0,120)||'Gerador Admin';
  if(mode==='beta'){
    const plan=['daily','weekly','monthly','lifetime'].includes(String(body.plan||''))?String(body.plan):'monthly';
    let raw=null;
    for(let a=0;a<3;a++){
      raw=newBetaKey();
      try{await registerBetaKey(raw,plan,label);break}catch(e){if(String(e.kind||'').includes('duplicate')&&a<2)continue;throw e}
    }
    return{mode,keys:[raw],message:'KEY BOT BETA criada. Ela será vinculada ao primeiro PC que ativar.'};
  }
  if(mode==='bot'){
    const device=String(body.deviceId||'').trim().toUpperCase();
    if(!device)throw new Error('Cole o ID do PC do cliente.');
    const plan=['daily','weekly','monthly'].includes(String(body.plan||''))?String(body.plan):'monthly';
    let raw=null;
    for(let a=0;a<3;a++){
      raw=newBotKey();
      try{await registerBotKey(raw,device,plan,label);break}catch(e){if(String(e.kind||'').includes('duplicate')&&a<2)continue;throw e}
    }
    return{mode,keys:[raw],message:'Key curta do Bot criada com sucesso e vinculada ao ID informado.'};
  }
  if(mode==='dashboard'){
    const kind=String(body.plan||'monthly')==='lifetime'?'lifetime':'monthly',raw=newDashboardKey();await registerDashboardKey(raw,kind,label);
    return{mode,keys:[raw],message:kind==='lifetime'?'Key vitalícia do Dashboard criada.':'Key mensal do Dashboard criada.'};
  }
  if(mode==='operacional'){
    const kind=String(body.plan||'monthly')==='lifetime'?'lifetime':'monthly',raw=newOperationalKey();await registerOperationalKey(raw,kind,label);
    return{mode,keys:[raw],message:kind==='lifetime'?'Key vitalícia do Operacional criada.':'Key mensal de 30 dias do Operacional criada.'};
  }
  const requested=parseInt(body.count,10),count=[1,5,10].includes(requested)?requested:1,keys=[];
  for(let i=0;i<count;i++){
    let done=false;
    for(let a=0;a<3&&!done;a++){
      const raw=newDownloadKey();try{await registerDownloadKey(raw,count>1?`${label} ${i+1}/${count}`:label);keys.push(raw);done=true}catch(e){if(String(e.kind||'').includes('duplicate')&&a<2)continue;throw e}
    }
  }
  return{mode:'download',keys,message:`${keys.length} key(s) de download criada(s) com sucesso.`};
}

function renderPage({message='',ok=false,keys=[],mode='download'}={}){
  const result=keys.length?`<section class="result ${ok?'ok':'err'}"><strong>${escapeHtml(message)}</strong><textarea id="resultKeys" readonly>${escapeHtml(keys.join('\n'))}</textarea><button type="button" class="secondary" onclick="copyKeys()">COPIAR KEY(S)</button></section>`:(message?`<div class="message ${ok?'ok':'err'}">${escapeHtml(message)}</div>`:'');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#09090c"><title>Gerador Mobile - Rico China</title><style>
*{box-sizing:border-box}body{margin:0;background:#07070a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;min-height:100vh}main{max-width:650px;margin:0 auto;padding:24px 16px 44px}.brand{display:flex;align-items:center;gap:12px;margin-bottom:22px}.logo{width:48px;height:48px;border-radius:14px;background:linear-gradient(145deg,#ff243b,#79000d);display:grid;place-items:center;font-size:25px;font-weight:900;box-shadow:0 10px 35px #e0002440}.brand h1{font-size:21px;margin:0}.brand p{margin:4px 0 0;color:#9da0aa;font-size:13px}.card{background:linear-gradient(180deg,#111116,#09090d);border:1px solid #44131a;border-radius:20px;padding:18px;box-shadow:0 18px 55px #0009}.tag{display:inline-block;font-size:11px;font-weight:900;letter-spacing:1.4px;color:#ff6675;border:1px solid #6b1721;background:#19070a;padding:7px 10px;border-radius:999px;margin-bottom:15px}label{display:block;font-size:13px;color:#c7c7ce;margin:14px 0 7px}input,select,button,textarea{width:100%;border-radius:12px;font:inherit}input,select,textarea{background:#07070a;border:1px solid #34343d;color:#fff;padding:14px 13px;outline:none}textarea{min-height:120px;resize:vertical;font-family:ui-monospace,Consolas,monospace;font-size:12px;line-height:1.45}button{border:0;padding:15px 14px;font-weight:900;cursor:pointer}.primary{margin-top:18px;background:linear-gradient(180deg,#ff2038,#cb001c);color:#fff}.secondary{margin-top:10px;background:#17171d;color:#fff;border:1px solid #363640}.mode-note{padding:12px;border-radius:12px;background:#0b0b10;border:1px solid #292932;color:#aeb2bc;font-size:12px;line-height:1.55;margin-top:10px}.message,.result{margin-top:16px;border-radius:14px;padding:14px;font-size:13px}.message.ok,.result.ok{background:#07150d;border:1px solid #174f2c;color:#7af1a2}.message.err,.result.err{background:#1a090b;border:1px solid #641822;color:#ff7985}.result textarea{margin-top:12px}.footer{text-align:center;color:#666b76;font-size:11px;margin-top:18px}.hidden{display:none}
</style></head><body><main><div class="brand"><div class="logo">R</div><div><h1>Rico China — Gerador Mobile</h1><p>BOT • BOT BETA • DASHBOARD • DOWNLOAD • OPERACIONAL</p></div></div><section class="card"><span class="tag">ACESSO ADMIN</span><form method="post" action="/generate"><label>Senha do gerador</label><input name="pin" type="password" autocomplete="current-password" required placeholder="Digite sua senha"><label>O que você quer gerar?</label><select id="mode" name="mode" onchange="toggleMode()"><option value="download" ${mode==='download'?'selected':''}>KEY DOWNLOAD SITE</option><option value="bot" ${mode==='bot'?'selected':''}>KEY BOT</option><option value="beta" ${mode==='beta'?'selected':''}>KEY BOT BETA — EQUIPE RICO</option><option value="dashboard" ${mode==='dashboard'?'selected':''}>KEY DASHBOARD</option><option value="operacional" ${mode==='operacional'?'selected':''}>KEY OPERACIONAL EQUIPE RICO</option></select>
<div id="downloadFields"><div class="mode-note">Libera um download do Controle Rico no site.</div><label>Cliente / observação</label><input name="label" maxlength="120"><label>Quantidade</label><select name="count"><option>1</option><option>5</option><option>10</option></select></div>
<div id="botFields" class="hidden"><div class="mode-note">Gera uma key curta BOT-RICO e vincula ao ID do PC.</div><label>ID do PC</label><input name="deviceId"><label>Validade</label><select name="botPlan"><option value="daily">1 dia</option><option value="weekly">7 dias</option><option value="monthly" selected>30 dias</option></select></div>
<div id="betaFields" class="hidden"><div class="mode-note">KEY BOT BETA do app EQUIPE RICO. A key se vincula automaticamente ao primeiro PC que ativar.</div><label>Cliente / observação</label><input name="betaLabel" maxlength="120"><label>Validade</label><select name="betaPlan"><option value="daily">1 dia</option><option value="weekly">7 dias</option><option value="monthly" selected>30 dias</option><option value="lifetime">Vitalícia</option></select></div>
<div id="accessFields" class="hidden"><div class="mode-note" id="accessNote">Gera acesso para o serviço selecionado.</div><label>Cliente / observação</label><input name="accessLabel" maxlength="120"><label>Validade</label><select name="accessPlan"><option value="monthly">Mensal - 30 dias</option><option value="lifetime">Vitalícia</option></select></div>
<button class="primary" type="submit">GERAR KEY</button></form>${result}</section><div class="footer">Gerador privado — somente administradores autorizados.</div></main><script>
function toggleMode(){const m=document.getElementById('mode').value;document.getElementById('downloadFields').classList.toggle('hidden',m!=='download');document.getElementById('botFields').classList.toggle('hidden',m!=='bot');document.getElementById('betaFields').classList.toggle('hidden',m!=='beta');document.getElementById('accessFields').classList.toggle('hidden',!['dashboard','operacional'].includes(m));document.getElementById('accessNote').textContent=m==='operacional'?'A key do Operacional será vinculada ao primeiro dispositivo que acessar o site.':'Gera uma key do Dashboard CPA Equipe Rico.'}toggleMode();
async function copyKeys(){const t=document.getElementById('resultKeys');if(!t)return;try{await navigator.clipboard.writeText(t.value)}catch{t.select();document.execCommand('copy')}}
</script></body></html>`;
}

const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/health')return sendJson(res,200,{ok:true,version:'2.3',modes:['download','bot','beta','dashboard','operacional'],botKeys:'short',betaKeys:'BOT-BETA-RICO'});
  if(req.method==='GET'&&(req.url==='/'||req.url.startsWith('/?')))return sendHtml(res,renderPage());

  if(req.method==='POST'&&req.url==='/api/activate-beta'){
    try{
      const body=await readBody(req);
      const rawKey=String(body.key||'').trim().toUpperCase();
      const deviceId=String(body.deviceId||'').trim().toUpperCase();
      if(!/^BOT-BETA-RICO(?:-[A-Z0-9]{4}){4}$/.test(rawKey)||deviceId.length<8||deviceId.length>100){
        return sendJson(res,200,{ok:false,message:'invalid_key'});
      }
      const result=await rpcRaw('activate_equipe_rico_beta_key',{p_key_hash:sha256(rawKey),p_device_id:deviceId});
      return sendJson(res,200,result||{ok:false,message:'invalid_key'});
    }catch(e){console.error('activate-beta',e);return sendJson(res,503,{ok:false,message:'validation_unavailable'});}
  }

  if(req.method==='POST'&&(req.url==='/generate'||req.url==='/api/generate')){
    try{
      const body=await readBody(req),auth=checkPin(req,body.pin);if(!auth.ok){if(req.url==='/api/generate')return sendJson(res,auth.status,{ok:false,message:auth.message});return sendHtml(res,renderPage({message:auth.message,ok:false,mode:String(body.mode||'download')}),auth.status)}
      const normalized={...body};
      if(String(body.mode)==='bot')normalized.plan=body.botPlan||body.plan||'monthly';
      if(String(body.mode)==='beta'){normalized.plan=body.betaPlan||body.plan||'monthly';normalized.label=body.betaLabel||body.label||'';}
      if(['dashboard','operacional'].includes(String(body.mode))){normalized.plan=body.accessPlan||body.plan||'monthly';normalized.label=body.accessLabel||body.label||''}
      const result=await generateKeys(normalized);
      if(req.url==='/api/generate')return sendJson(res,200,{ok:true,...result});
      return sendHtml(res,renderPage({message:result.message,ok:true,keys:result.keys,mode:result.mode}));
    }catch(e){console.error(e);const msg=e?.message||'Erro interno ao gerar key.';if(req.url==='/api/generate')return sendJson(res,500,{ok:false,message:msg});return sendHtml(res,renderPage({message:msg,ok:false}),500)}
  }
  sendJson(res,404,{ok:false,message:'not_found'});
});
server.listen(PORT,()=>console.log(`Gerador Mobile Rico online na porta ${PORT} - BOT + BOT BETA`));
