const express=require('express');
const path=require('path');
const fs=require('fs');

const app=express();
const port=process.env.PORT||10000;
const CUT=22.45;
const PHRASE='Neste momento, eu vou demonstrar na prática o funcionamento do Baú de 50, para que você entenda de forma clara como esse processo é executado dentro da operação.';
const PUBLIC_DIR=path.join(__dirname,'public');
const MAIN_FILE=path.join(PUBLIC_DIR,'main-clean.mp4');
const DEMO_FILE=path.join(PUBLIC_DIR,'demo-light.mp4');

app.use('/assets',express.static(PUBLIC_DIR,{maxAge:'1d',immutable:false,acceptRanges:true}));
app.get('/status',(_,res)=>res.json({
  ok:fs.existsSync(MAIN_FILE)&&fs.existsSync(DEMO_FILE),
  published:false,
  mainWatermarkRemoved:true,
  mainOptimized:true,
  demoOriginal:true,
  demoOptimized:true,
  phraseBeforeDemo:true,
  voicePreference:'Marcos / PT-BR — sem fallback',
  neverBlocksOnVoice:true,
  mainBytes:fs.existsSync(MAIN_FILE)?fs.statSync(MAIN_FILE).size:0,
  demoBytes:fs.existsSync(DEMO_FILE)?fs.statSync(DEMO_FILE).size:0
}));

app.get('/',(_,res)=>{
res.type('html').send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Prévia Rico CPA • Baú de 50</title><style>
*{box-sizing:border-box}body{margin:0;background:#050608;color:#fff;font-family:Inter,Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:18px}.wrap{width:min(94vw,540px)}.top{text-align:center;margin-bottom:12px}.badge{display:inline-block;padding:7px 11px;border:1px solid #30343a;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#cfd3d8}.top h1{font-size:21px;margin:10px 0 4px}.top p{margin:0;color:#9da3aa;font-size:13px}.stage{position:relative;aspect-ratio:9/16;background:#000;border-radius:20px;overflow:hidden;box-shadow:0 20px 70px #000}.stage video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}.hidden{display:none}.transition{position:absolute;inset:0;display:none;align-items:center;justify-content:center;text-align:center;padding:36px;background:radial-gradient(circle at 50% 40%,#1b1e24 0,#090a0d 60%,#000 100%);z-index:20}.transition.on{display:flex}.transition .red{color:#ff3556;font-weight:900;letter-spacing:.12em;font-size:13px}.transition h2{font-size:42px;line-height:.95;margin:13px 0 16px}.transition p{font-size:15px;color:#fff;line-height:1.55}.demo-label{position:absolute;left:16px;right:16px;top:16px;z-index:3;background:#06070acc;border:1px solid #34373d;border-radius:12px;padding:10px;text-align:center;font-weight:900;font-size:12px;letter-spacing:.08em;display:none}.demo-label.on{display:block}.controls{margin-top:14px;display:grid;gap:8px}.btn{border:0;border-radius:13px;padding:15px 16px;font-weight:900;font-size:15px;cursor:pointer}.btn.primary{background:#fff;color:#050608}.btn.secondary{background:#17191d;color:#fff;border:1px solid #2b2e34}.msg{font-size:12px;text-align:center;color:#9ca2aa;min-height:18px;margin-top:8px}.ok{color:#9cffb4}.bad{color:#ff8585}
</style></head><body><div class="wrap"><div class="top"><span class="badge">PRÉVIA PARA APROVAÇÃO</span><h1>Rico CPA • Baú de 50</h1><p>Nada desta versão foi publicado na Central.</p></div><div class="stage">
<video id="main" playsinline preload="auto" src="/assets/main-clean.mp4?v=5"></video>
<div id="transition" class="transition"><div><div class="red">DEMONSTRAÇÃO PRÁTICA</div><h2>BAÚ DE 50</h2><p>${PHRASE}</p></div></div>
<video id="demo" class="hidden" playsinline preload="auto" src="/assets/demo-light.mp4?v=5"></video>
<div id="label" class="demo-label">BAÚ DE 50 • DEMONSTRAÇÃO NA PRÁTICA</div>
</div><div class="controls"><button id="play" class="btn primary">▶ ASSISTIR PRÉVIA COMPLETA</button><button id="restart" class="btn secondary">↻ RECOMEÇAR</button></div><div id="msg" class="msg">Versão corrigida para nunca travar na transição.</div></div>
<script>
const main=document.getElementById('main'),demo=document.getElementById('demo'),transition=document.getElementById('transition'),label=document.getElementById('label'),play=document.getElementById('play'),restart=document.getElementById('restart'),msg=document.getElementById('msg');const CUT=${CUT},PHRASE=${JSON.stringify(PHRASE)};let sequenceStarted=false,demoFinished=false,speaking=false,demoWarm=false,sequenceToken=0;
function getVoices(){try{return speechSynthesis.getVoices()||[]}catch(e){return[]}}
function findMarcos(){return getVoices().find(v=>/marcos/i.test((v.name||'')+' '+(v.voiceURI||'')))||null}
function waitForMarcos(timeout=1000){return new Promise(resolve=>{let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(timer);try{speechSynthesis.removeEventListener('voiceschanged',changed)}catch(e){}resolve(v||null)};const changed=()=>{const v=findMarcos();if(v)finish(v)};const v=findMarcos();if(v)return finish(v);try{speechSynthesis.addEventListener('voiceschanged',changed)}catch(e){}const timer=setTimeout(()=>finish(findMarcos()),timeout)})}
function speakWithTimeout(voice,timeout=14000){return new Promise((resolve,reject)=>{let done=false;const finish=(ok,err)=>{if(done)return;done=true;clearTimeout(timer);speaking=false;ok?resolve():reject(err||new Error('Falha na voz'))};const utter=new SpeechSynthesisUtterance(PHRASE);utter.lang='pt-BR';utter.rate=.91;utter.pitch=.94;utter.volume=1;utter.voice=voice;utter.onend=()=>finish(true);utter.onerror=e=>finish(false,e);const timer=setTimeout(()=>{try{speechSynthesis.cancel()}catch(e){}finish(false,new Error('Tempo da voz excedido'))},timeout);speaking=true;try{speechSynthesis.cancel();speechSynthesis.speak(utter);msg.textContent='Voz: '+voice.name}catch(e){finish(false,e)}})}
async function trySpeakMarcos(){if(!('speechSynthesis'in window))return false;const voice=await waitForMarcos();if(!voice)return false;try{await speakWithTimeout(voice);return true}catch(e){return false}}
function warmDemo(){if(demoWarm)return;demoWarm=true;demo.preload='auto';try{demo.load()}catch(e){}}
function showMain(){demo.pause();demo.classList.add('hidden');label.classList.remove('on');transition.classList.remove('on');main.classList.remove('hidden')}
function startDemo(token){if(token!==sequenceToken)return;transition.classList.remove('on');main.classList.add('hidden');demo.classList.remove('hidden');label.classList.add('on');try{demo.currentTime=0}catch(e){}const p=demo.play();if(p&&p.then)p.then(()=>msg.textContent='Reproduzindo demonstração otimizada.').catch(()=>{msg.innerHTML='<span class="bad">Clique no vídeo para continuar a demonstração.</span>'});}
async function startPhrase(){if(sequenceStarted)return;sequenceStarted=true;const token=++sequenceToken;main.pause();try{main.currentTime=CUT}catch(e){}warmDemo();transition.classList.add('on');msg.textContent='Preparando narração…';const spoke=await trySpeakMarcos();if(token!==sequenceToken)return;if(!spoke){msg.innerHTML='<span class="bad">Voz Marcos indisponível neste navegador; seguindo sem travar.</span>';await new Promise(r=>setTimeout(r,900));}startDemo(token)}
main.addEventListener('timeupdate',()=>{if(!demoWarm&&main.currentTime>=Math.max(0,CUT-8))warmDemo();if(!sequenceStarted&&main.currentTime>=CUT)startPhrase()});
main.addEventListener('waiting',()=>msg.textContent='Carregando um trecho…');
main.addEventListener('playing',()=>{if(!sequenceStarted)msg.textContent='Reproduzindo a versão otimizada…'});
demo.addEventListener('waiting',()=>msg.textContent='Carregando demonstração…');
demo.addEventListener('canplay',()=>{if(sequenceStarted&&!demo.classList.contains('hidden')&&demo.paused){const p=demo.play();if(p&&p.catch)p.catch(()=>{})}});
demo.addEventListener('ended',()=>{demoFinished=true;showMain();try{main.currentTime=CUT+.08}catch(e){}const p=main.play();if(p&&p.catch)p.catch(()=>{});msg.innerHTML='<span class="ok">Demonstração concluída. Continuando o vídeo…</span>'});
main.addEventListener('ended',()=>{msg.innerHTML='<span class="ok">Prévia concluída ✓</span>';play.textContent='▶ ASSISTIR NOVAMENTE'});
play.onclick=()=>{if(main.ended||demoFinished){try{speechSynthesis.cancel()}catch(e){}sequenceToken++;sequenceStarted=false;demoFinished=false;try{main.currentTime=0;demo.currentTime=0}catch(e){}}showMain();const p=main.play();if(p&&p.catch)p.catch(()=>{});play.textContent='⏸ TOQUE NO VÍDEO PARA PAUSAR';msg.textContent='Reproduzindo a versão para aprovação…'};
main.onclick=()=>{const p=main.paused?main.play():(main.pause(),null);if(p&&p.catch)p.catch(()=>{})};demo.onclick=()=>{const p=demo.paused?demo.play():(demo.pause(),null);if(p&&p.catch)p.catch(()=>{})};
restart.onclick=()=>{try{speechSynthesis.cancel()}catch(e){}sequenceToken++;speaking=false;demo.pause();main.pause();sequenceStarted=false;demoFinished=false;try{main.currentTime=0;demo.currentTime=0}catch(e){}showMain();msg.textContent='Prévia reiniciada.';play.textContent='▶ ASSISTIR PRÉVIA COMPLETA'};
</script></body></html>`)});

app.listen(port,()=>console.log('Rico CPA preview online',port));