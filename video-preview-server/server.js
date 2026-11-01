const express=require('express');
const {Readable}=require('stream');

const app=express();
const port=process.env.PORT||10000;

const MAIN_VIDEO='https://rico-video-assets-temp.onrender.com/Rico_CPA_V3_EXPLICATIVO_PRO.mp4';
const ORIGINAL_DEMO='https://at.adobe.com/qAUNMnr2IVM5l7Ao';
const PHRASE_AUDIO='https://at.adobe.com/jE8FSnniQAXyw6VZ';
const CUT=22.45;
const PHRASE='Neste momento, eu vou demonstrar na prática o funcionamento do Baú de 50, para que você entenda de forma clara como esse processo é executado dentro da operação.';

async function proxy(req,res,url,type){
  try{
    const headers={'user-agent':'Mozilla/5.0'};
    if(req.headers.range) headers.Range=req.headers.range;
    const r=await fetch(url,{redirect:'follow',headers});
    if(!r.ok && r.status!==206) throw new Error('Falha ao abrir mídia: HTTP '+r.status);
    res.status(r.status);
    ['content-type','content-length','content-range','accept-ranges','etag','last-modified'].forEach(h=>{
      const v=r.headers.get(h); if(v) res.setHeader(h,v);
    });
    if(type) res.setHeader('Content-Type',type);
    res.setHeader('Cache-Control','no-store');
    if(!r.body) return res.end();
    Readable.fromWeb(r.body).pipe(res);
  }catch(e){console.error(e);res.status(502).send(e.message)}
}

app.get('/demo.mov',(req,res)=>proxy(req,res,ORIGINAL_DEMO,'video/quicktime'));
app.get('/phrase.m4a',(req,res)=>proxy(req,res,PHRASE_AUDIO,'audio/mp4'));
app.get('/status',(_,res)=>res.json({ok:true,published:false,demoSource:'original-upload',watermark:false,phraseBeforeDemo:true,cut:CUT}));

app.get('/',(_,res)=>{
res.type('html').send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Prévia Rico CPA • Baú de 50</title><style>
*{box-sizing:border-box}body{margin:0;background:#050608;color:#fff;font-family:Inter,Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:18px}.wrap{width:min(94vw,540px)}.top{text-align:center;margin-bottom:12px}.badge{display:inline-block;padding:7px 11px;border:1px solid #30343a;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#cfd3d8}.top h1{font-size:21px;margin:10px 0 4px}.top p{margin:0;color:#9da3aa;font-size:13px}.stage{position:relative;aspect-ratio:9/16;background:#000;border-radius:20px;overflow:hidden;box-shadow:0 20px 70px #000}.stage video{position:absolute;background:#000}.stage #main{width:118%;height:118%;left:-6%;top:-5%;object-fit:cover}.stage #demo{inset:0;width:100%;height:100%;object-fit:contain}.hidden{display:none}.transition{position:absolute;inset:0;display:none;align-items:center;justify-content:center;text-align:center;padding:36px;background:radial-gradient(circle at 50% 40%,#1b1e24 0,#090a0d 60%,#000 100%);z-index:20}.transition.on{display:flex}.transition .red{color:#ff3556;font-weight:900;letter-spacing:.12em;font-size:13px}.transition h2{font-size:42px;line-height:.95;margin:13px 0 16px}.transition p{font-size:15px;color:#fff;line-height:1.55}.wm-cover{position:absolute;left:0;top:0;width:190px;height:105px;background:#000;z-index:10;pointer-events:none}.demo-label{position:absolute;left:16px;right:16px;top:16px;z-index:3;background:#06070acc;border:1px solid #34373d;border-radius:12px;padding:10px;text-align:center;font-weight:900;font-size:12px;letter-spacing:.08em;display:none}.demo-label.on{display:block}.controls{margin-top:14px;display:grid;gap:8px}.btn{border:0;border-radius:13px;padding:15px 16px;font-weight:900;font-size:15px;cursor:pointer}.btn.primary{background:#fff;color:#050608}.btn.secondary{background:#17191d;color:#fff;border:1px solid #2b2e34}.msg{font-size:12px;text-align:center;color:#9ca2aa;min-height:18px;margin-top:8px}.ok{color:#9cffb4}.bad{color:#ff8585}
</style></head><body><div class="wrap"><div class="top"><span class="badge">PRÉVIA PARA APROVAÇÃO</span><h1>Rico CPA • Baú de 50</h1><p>Nada desta versão foi publicado na Central.</p></div><div class="stage">
<video id="main" playsinline preload="metadata" src="${MAIN_VIDEO}"></video><div class="wm-cover"></div>
<div id="transition" class="transition"><div><div class="red">DEMONSTRAÇÃO PRÁTICA</div><h2>BAÚ DE 50</h2><p>${PHRASE}</p></div></div>
<video id="demo" class="hidden" playsinline preload="metadata" src="/demo.mov?v=original"></video>
<div id="label" class="demo-label">BAÚ DE 50 • DEMONSTRAÇÃO NA PRÁTICA</div>
<audio id="phrase" preload="auto" src="/phrase.m4a?v=1"></audio>
</div><div class="controls"><button id="play" class="btn primary">▶ ASSISTIR PRÉVIA COMPLETA</button><button id="restart" class="btn secondary">↻ RECOMEÇAR</button></div><div id="msg" class="msg">A demonstração usa o arquivo original enviado por você, sem passar pelo Descript.</div></div>
<script>
const main=document.getElementById('main'),demo=document.getElementById('demo'),phrase=document.getElementById('phrase'),transition=document.getElementById('transition'),label=document.getElementById('label'),play=document.getElementById('play'),restart=document.getElementById('restart'),msg=document.getElementById('msg');const CUT=${CUT};let sequenceStarted=false,demoFinished=false;
function showMain(){demo.pause();demo.classList.add('hidden');label.classList.remove('on');transition.classList.remove('on');main.classList.remove('hidden')}
async function startPhrase(){if(sequenceStarted)return;sequenceStarted=true;main.pause();main.currentTime=CUT;transition.classList.add('on');phrase.currentTime=0;try{await phrase.play();msg.textContent='Frase de transição antes da demonstração…'}catch(e){msg.innerHTML='<span class="bad">Toque novamente em ASSISTIR PRÉVIA para liberar a frase.</span>'}}
function startDemo(){transition.classList.remove('on');main.classList.add('hidden');demo.classList.remove('hidden');label.classList.add('on');demo.currentTime=0;demo.play().then(()=>{msg.textContent='Reproduzindo sua gravação original, sem marca d’água.'}).catch(()=>{msg.innerHTML='<span class="bad">Toque no vídeo para iniciar a demonstração.</span>'})}
main.addEventListener('timeupdate',()=>{if(!sequenceStarted&&main.currentTime>=CUT)startPhrase()});
phrase.addEventListener('ended',startDemo);
demo.addEventListener('ended',()=>{demoFinished=true;showMain();main.currentTime=CUT+.08;main.play();msg.innerHTML='<span class="ok">Demonstração concluída. Continuando o vídeo original…</span>'});
main.addEventListener('ended',()=>{msg.innerHTML='<span class="ok">Prévia concluída ✓</span>';play.textContent='▶ ASSISTIR NOVAMENTE'});
play.onclick=()=>{if(sequenceStarted&&!demoFinished&&transition.classList.contains('on')&&phrase.paused){phrase.play();return}if(main.ended||demoFinished){sequenceStarted=false;demoFinished=false;main.currentTime=0;demo.currentTime=0;phrase.currentTime=0}showMain();main.play();play.textContent='⏸ TOQUE NO VÍDEO PARA PAUSAR';msg.textContent='Reproduzindo a versão para aprovação…'};
main.onclick=()=>main.paused?main.play():main.pause();demo.onclick=()=>demo.paused?demo.play():demo.pause();
restart.onclick=()=>{phrase.pause();demo.pause();main.pause();sequenceStarted=false;demoFinished=false;main.currentTime=0;demo.currentTime=0;phrase.currentTime=0;showMain();msg.textContent='Prévia reiniciada. Toque em ASSISTIR PRÉVIA COMPLETA.';play.textContent='▶ ASSISTIR PRÉVIA COMPLETA'};
</script></body></html>`)});

app.listen(port,()=>console.log('Rico CPA preview using original demo upload',port));