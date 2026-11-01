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
  mainBytes:fs.existsSync(MAIN_FILE)?fs.statSync(MAIN_FILE).size:0,
  demoBytes:fs.existsSync(DEMO_FILE)?fs.statSync(DEMO_FILE).size:0
}));

app.get('/',(_,res)=>{
res.type('html').send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Prévia Rico CPA • Baú de 50</title><style>
*{box-sizing:border-box}body{margin:0;background:#050608;color:#fff;font-family:Inter,Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:18px}.wrap{width:min(94vw,540px)}.top{text-align:center;margin-bottom:12px}.badge{display:inline-block;padding:7px 11px;border:1px solid #30343a;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#cfd3d8}.top h1{font-size:21px;margin:10px 0 4px}.top p{margin:0;color:#9da3aa;font-size:13px}.stage{position:relative;aspect-ratio:9/16;background:#000;border-radius:20px;overflow:hidden;box-shadow:0 20px 70px #000}.stage video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}.hidden{display:none}.transition{position:absolute;inset:0;display:none;align-items:center;justify-content:center;text-align:center;padding:36px;background:radial-gradient(circle at 50% 40%,#1b1e24 0,#090a0d 60%,#000 100%);z-index:20}.transition.on{display:flex}.transition .red{color:#ff3556;font-weight:900;letter-spacing:.12em;font-size:13px}.transition h2{font-size:42px;line-height:.95;margin:13px 0 16px}.transition p{font-size:15px;color:#fff;line-height:1.55}.demo-label{position:absolute;left:16px;right:16px;top:16px;z-index:3;background:#06070acc;border:1px solid #34373d;border-radius:12px;padding:10px;text-align:center;font-weight:900;font-size:12px;letter-spacing:.08em;display:none}.demo-label.on{display:block}.controls{margin-top:14px;display:grid;gap:8px}.btn{border:0;border-radius:13px;padding:15px 16px;font-weight:900;font-size:15px;cursor:pointer}.btn.primary{background:#fff;color:#050608}.btn.secondary{background:#17191d;color:#fff;border:1px solid #2b2e34}.msg{font-size:12px;text-align:center;color:#9ca2aa;min-height:18px;margin-top:8px}.ok{color:#9cffb4}.bad{color:#ff8585}
</style></head><body><div class="wrap"><div class="top"><span class="badge">PRÉVIA PARA APROVAÇÃO</span><h1>Rico CPA • Baú de 50</h1><p>Nada desta versão foi publicado na Central.</p></div><div class="stage">
<video id="main" playsinline preload="auto" src="/assets/main-clean.mp4?v=4"></video>
<div id="transition" class="transition"><div><div class="red">DEMONSTRAÇÃO PRÁTICA</div><h2>BAÚ DE 50</h2><p>${PHRASE}</p></div></div>
<video id="demo" class="hidden" playsinline preload="metadata" src="/assets/demo-light.mp4?v=4"></video>
<div id="label" class="demo-label">BAÚ DE 50 • DEMONSTRAÇÃO NA PRÁTICA</div>
</div><div class="controls"><button id="play" class="btn primary">▶ ASSISTIR PRÉVIA COMPLETA</button><button id="restart" class="btn secondary">↻ RECOMEÇAR</button></div><div id="msg" class="msg">Versão otimizada para tocar sem travar.</div></div>
<script>
const main=document.getElementById('main'),demo=document.getElementById('demo'),transition=document.getElementById('transition'),label=document.getElementById('label'),play=document.getElementById('play'),restart=document.getElementById('restart'),msg=document.getElementById('msg');const CUT=${CUT},PHRASE=${JSON.stringify(PHRASE)};let sequenceStarted=false,demoFinished=false,speaking=false,demoWarm=false;
function getVoices(){return speechSynthesis.getVoices()||[]}
function findMarcos(){return getVoices().find(v=>/marcos/i.test((v.name||'')+' '+(v.voiceURI||'')))||null}
function waitForMarcos(timeout=4500){return new Promise(resolve=>{const ready=()=>{const v=findMarcos();if(v){cleanup();resolve(v);return true}return false};let timer;const changed=()=>ready();const cleanup=()=>{clearTimeout(timer);speechSynthesis.removeEventListener('voiceschanged',changed)};speechSynthesis.addEventListener('voiceschanged',changed);if(ready())return;timer=setTimeout(()=>{cleanup();resolve(findMarcos())},timeout);try{speechSynthesis.getVoices()}catch(e){}})}
async function speakPhrase(){
 if(!('speechSynthesis'in window))throw new Error('Sem TTS');
 const voice=await waitForMarcos();
 if(!voice)throw new Error('Voz Marcos não instalada neste navegador');
 speechSynthesis.cancel();
 const utter=new SpeechSynthesisUtterance(PHRASE);utter.lang='pt-BR';utter.rate=.91;utter.pitch=.94;utter.volume=1;utter.voice=voice;
 speaking=true;
 return new Promise((resolve,reject)=>{utter.onend=()=>{speaking=false;resolve()};utter.onerror=e=>{speaking=false;reject(e)};speechSynthesis.speak(utter);msg.textContent='Voz: '+voice.name});
}
function warmDemo(){if(demoWarm)return;demoWarm=true;demo.preload='auto';try{demo.load()}catch(e){}}
function showMain(){demo.pause();demo.classList.add('hidden');label.classList.remove('on');transition.classList.remove('on');main.classList.remove('hidden')}
async function startPhrase(){if(sequenceStarted)return;sequenceStarted=true;main.pause();main.currentTime=CUT;warmDemo();transition.classList.add('on');try{await speakPhrase();startDemo()}catch(e){sequenceStarted=false;transition.classList.remove('on');msg.innerHTML='<span class="bad">A voz Marcos não está disponível neste navegador. Nenhuma outra voz foi usada.</span>'}}
function startDemo(){transition.classList.remove('on');main.classList.add('hidden');demo.classList.remove('hidden');label.classList.add('on');demo.currentTime=0;demo.play().then(()=>msg.textContent='Reproduzindo demonstração otimizada.').catch(()=>msg.innerHTML='<span class="bad">Toque no vídeo para iniciar a demonstração.</span>')}
main.addEventListener('timeupdate',()=>{if(!demoWarm&&main.currentTime>=Math.max(0,CUT-6))warmDemo();if(!sequenceStarted&&main.currentTime>=CUT)startPhrase()});
main.addEventListener('waiting',()=>msg.textContent='Carregando um trecho…');
main.addEventListener('playing',()=>{if(!sequenceStarted)msg.textContent='Reproduzindo a versão otimizada…'});
demo.addEventListener('waiting',()=>msg.textContent='Carregando demonstração…');
demo.addEventListener('ended',()=>{demoFinished=true;showMain();main.currentTime=CUT+.08;main.play();msg.innerHTML='<span class="ok">Demonstração concluída. Continuando o vídeo…</span>'});
main.addEventListener('ended',()=>{msg.innerHTML='<span class="ok">Prévia concluída ✓</span>';play.textContent='▶ ASSISTIR NOVAMENTE'});
play.onclick=()=>{if(speaking)return;if(main.ended||demoFinished){speechSynthesis.cancel();sequenceStarted=false;demoFinished=false;main.currentTime=0;demo.currentTime=0}showMain();main.play();play.textContent='⏸ TOQUE NO VÍDEO PARA PAUSAR';msg.textContent='Reproduzindo a versão para aprovação…'};
main.onclick=()=>main.paused?main.play():main.pause();demo.onclick=()=>demo.paused?demo.play():demo.pause();
restart.onclick=()=>{speechSynthesis.cancel();speaking=false;demo.pause();main.pause();sequenceStarted=false;demoFinished=false;main.currentTime=0;demo.currentTime=0;showMain();msg.textContent='Prévia reiniciada.';play.textContent='▶ ASSISTIR PRÉVIA COMPLETA'};
</script></body></html>`)});

app.listen(port,()=>console.log('Rico CPA prebuilt preview online',port));