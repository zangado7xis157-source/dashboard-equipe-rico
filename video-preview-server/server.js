const express=require('express');
const {Readable}=require('stream');

const app=express();
const port=process.env.PORT||10000;
const CUT=22.45;
const PHRASE='Neste momento, eu vou demonstrar na prática o funcionamento do Baú de 50, para que você entenda de forma clara como esse processo é executado dentro da operação.';
const MAIN_URL='https://rico-video-assets-temp.onrender.com/Rico_CPA_V3_EXPLICATIVO_PRO.mp4';
const DEMO_SHARE='https://share.descript.com/view/cbKir7L8CmY';
let demoCache={url:null,at:0};

async function demoUrl(){
  if(demoCache.url&&Date.now()-demoCache.at<5*60*1000)return demoCache.url;
  const r=await fetch(DEMO_SHARE,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0'}});
  if(!r.ok)throw new Error('Falha ao abrir demo: '+r.status);
  const html=await r.text();
  const m=html.match(/property="descript:video" content="([^"]+)"/i);
  if(!m)throw new Error('URL de vídeo da demo não encontrada');
  const url=m[1].replace(/&amp;/g,'&').replace(/&#x3D;/g,'=').replace(/&#61;/g,'=');
  demoCache={url,at:Date.now()};
  return url;
}

async function proxyVideo(req,res,url){
  const headers={'user-agent':'Mozilla/5.0'};
  if(req.headers.range)headers.Range=req.headers.range;
  const upstream=await fetch(url,{headers,redirect:'follow'});
  res.status(upstream.status);
  for(const h of ['content-type','content-length','content-range','accept-ranges','etag','last-modified']){
    const v=upstream.headers.get(h); if(v)res.setHeader(h,v);
  }
  res.setHeader('Cache-Control','public,max-age=300');
  res.setHeader('Access-Control-Allow-Origin','*');
  if(!upstream.body)return res.end();
  Readable.fromWeb(upstream.body).pipe(res);
}

app.get('/media/main',async(req,res)=>{try{await proxyVideo(req,res,MAIN_URL)}catch(e){console.error(e);res.status(502).send('Vídeo principal indisponível')}});
app.get('/media/demo',async(req,res)=>{try{await proxyVideo(req,res,await demoUrl())}catch(e){console.error(e);demoCache={url:null,at:0};res.status(502).send('Demonstração indisponível')}});
app.get('/status',async(_,res)=>{let demoReady=true;try{await demoUrl()}catch(e){demoReady=false}res.json({ok:demoReady,streaming:true,heavyBuild:false,voice:'Marcos only, no fallback',cut:CUT})});

app.get('/',(_,res)=>res.type('html').send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Prévia Rico CPA • Baú de 50</title><style>
*{box-sizing:border-box}body{margin:0;background:#050608;color:#fff;font-family:Inter,Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:18px}.wrap{width:min(94vw,540px)}.top{text-align:center;margin-bottom:12px}.badge{display:inline-block;padding:7px 11px;border:1px solid #30343a;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#cfd3d8}.top h1{font-size:21px;margin:10px 0 4px}.top p{margin:0;color:#9da3aa;font-size:13px}.stage{position:relative;aspect-ratio:9/16;background:#000;border-radius:20px;overflow:hidden;box-shadow:0 20px 70px #000}.stage video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}.hidden{display:none}.transition{position:absolute;inset:0;display:none;align-items:center;justify-content:center;text-align:center;padding:36px;background:radial-gradient(circle at 50% 40%,#1b1e24 0,#090a0d 60%,#000 100%);z-index:20}.transition.on{display:flex}.transition .red{color:#ff3556;font-weight:900;letter-spacing:.12em;font-size:13px}.transition h2{font-size:42px;line-height:.95;margin:13px 0 16px}.transition p{font-size:15px;line-height:1.55}.demo-label{position:absolute;left:16px;right:16px;top:16px;z-index:3;background:#06070acc;border:1px solid #34373d;border-radius:12px;padding:10px;text-align:center;font-weight:900;font-size:12px;letter-spacing:.08em;display:none}.demo-label.on{display:block}.controls{margin-top:14px;display:grid;gap:8px}.btn{border:0;border-radius:13px;padding:15px 16px;font-weight:900;font-size:15px;cursor:pointer}.btn.primary{background:#fff;color:#050608}.btn.secondary{background:#17191d;color:#fff;border:1px solid #2b2e34}.msg{font-size:12px;text-align:center;color:#9ca2aa;min-height:18px;margin-top:8px}.ok{color:#9cffb4}.bad{color:#ff8585}
</style></head><body><div class="wrap"><div class="top"><span class="badge">PRÉVIA PARA APROVAÇÃO</span><h1>Rico CPA • Baú de 50</h1><p>Versão streaming • sem reconstrução pesada.</p></div><div class="stage"><video id="main" playsinline preload="auto" src="/media/main?v=6"></video><div id="transition" class="transition"><div><div class="red">DEMONSTRAÇÃO PRÁTICA</div><h2>BAÚ DE 50</h2><p>${PHRASE}</p></div></div><video id="demo" class="hidden" playsinline preload="auto" src="/media/demo?v=6"></video><div id="label" class="demo-label">BAÚ DE 50 • DEMONSTRAÇÃO NA PRÁTICA</div></div><div class="controls"><button id="play" class="btn primary">▶ ASSISTIR PRÉVIA COMPLETA</button><button id="restart" class="btn secondary">↻ RECOMEÇAR</button></div><div id="msg" class="msg">Pronto para testar.</div></div><script>
const main=document.getElementById('main'),demo=document.getElementById('demo'),transition=document.getElementById('transition'),label=document.getElementById('label'),play=document.getElementById('play'),restart=document.getElementById('restart'),msg=document.getElementById('msg');const CUT=${CUT},PHRASE=${JSON.stringify(PHRASE)};let sequenceStarted=false,demoFinished=false,token=0;
function voices(){try{return speechSynthesis.getVoices()||[]}catch(e){return[]}}
function marcos(){return voices().find(v=>/marcos/i.test((v.name||'')+' '+(v.voiceURI||'')))||null}
function waitMarcos(ms=1000){return new Promise(resolve=>{let done=false,timer=null;const finish=v=>{if(done)return;done=true;if(timer)clearTimeout(timer);try{speechSynthesis.removeEventListener('voiceschanged',changed)}catch(e){}resolve(v||null)};const changed=()=>{const v=marcos();if(v)finish(v)};const v=marcos();if(v)return finish(v);try{speechSynthesis.addEventListener('voiceschanged',changed)}catch(e){}timer=setTimeout(()=>finish(marcos()),ms)})}
function speak(v){return new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);resolve()};const u=new SpeechSynthesisUtterance(PHRASE);u.lang='pt-BR';u.voice=v;u.rate=.91;u.pitch=.94;u.volume=1;u.onend=finish;u.onerror=finish;const timer=setTimeout(()=>{try{speechSynthesis.cancel()}catch(e){}finish()},14000);try{speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){finish()}})}
function showMain(){demo.pause();demo.classList.add('hidden');label.classList.remove('on');transition.classList.remove('on');main.classList.remove('hidden')}
async function startDemo(my){if(my!==token)return;transition.classList.remove('on');main.classList.add('hidden');demo.classList.remove('hidden');label.classList.add('on');try{demo.currentTime=0}catch(e){}try{await demo.play();msg.textContent='Demonstração em reprodução.'}catch(e){msg.innerHTML='<span class="bad">Clique no vídeo para continuar.</span>'}}
async function startSequence(){if(sequenceStarted)return;sequenceStarted=true;const my=++token;main.pause();try{main.currentTime=CUT}catch(e){}transition.classList.add('on');msg.textContent='Preparando a narração…';let v=null;if('speechSynthesis'in window)v=await waitMarcos();if(my!==token)return;if(v){msg.textContent='Voz: '+v.name;await speak(v)}else{msg.innerHTML='<span class="bad">Voz Marcos não disponível neste Chrome. Seguindo sem travar.</span>';await new Promise(r=>setTimeout(r,900))}if(my===token)startDemo(my)}
main.addEventListener('timeupdate',()=>{if(!sequenceStarted&&main.currentTime>=CUT)startSequence()});
demo.addEventListener('ended',async()=>{demoFinished=true;showMain();try{main.currentTime=CUT+.08}catch(e){}try{await main.play()}catch(e){}msg.innerHTML='<span class="ok">Demonstração concluída. Continuando…</span>'});
main.addEventListener('ended',()=>{msg.innerHTML='<span class="ok">Prévia concluída ✓</span>';play.textContent='▶ ASSISTIR NOVAMENTE'});
main.addEventListener('waiting',()=>msg.textContent='Carregando vídeo principal…');demo.addEventListener('waiting',()=>msg.textContent='Carregando demonstração…');
play.onclick=async()=>{if(main.ended||demoFinished){token++;sequenceStarted=false;demoFinished=false;try{speechSynthesis.cancel()}catch(e){}try{main.currentTime=0;demo.currentTime=0}catch(e){}}showMain();try{await main.play()}catch(e){}play.textContent='⏸ TOQUE NO VÍDEO PARA PAUSAR';msg.textContent='Reproduzindo…'};
main.onclick=()=>main.paused?main.play().catch(()=>{}):main.pause();demo.onclick=()=>demo.paused?demo.play().catch(()=>{}):demo.pause();
restart.onclick=()=>{token++;sequenceStarted=false;demoFinished=false;try{speechSynthesis.cancel()}catch(e){}main.pause();demo.pause();try{main.currentTime=0;demo.currentTime=0}catch(e){}showMain();msg.textContent='Prévia reiniciada.';play.textContent='▶ ASSISTIR PRÉVIA COMPLETA'};
</script></body></html>`));

app.listen(port,()=>console.log('Rico CPA streaming preview online',port));
