const express=require('express');

const app=express();
const port=process.env.PORT||10000;
const MAIN_VIDEO='https://rico-video-assets-temp.onrender.com/Rico_CPA_V3_EXPLICATIVO_PRO.mp4';
const CLIP_SHARE='https://share.descript.com/view/AkwOxO5O5gg';
const TRANSITION_AT=18.6;
const CUT=22.45;

async function directVideoUrl(shareUrl){
  const r=await fetch(shareUrl,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0'}});
  if(!r.ok) throw new Error('Falha ao consultar a gravação: '+r.status);
  const html=await r.text();
  const m=html.match(/property="descript:video" content="([^"]+)"/i);
  if(!m) throw new Error('Arquivo da gravação não encontrado');
  return m[1].replace(/&amp;/g,'&').replace(/&#x3D;/g,'=');
}

app.get('/demo.mp4',async(req,res)=>{
  try{
    const url=await directVideoUrl(CLIP_SHARE);
    const headers={};
    if(req.headers.range) headers.Range=req.headers.range;
    const r=await fetch(url,{redirect:'follow',headers:{...headers,'user-agent':'Mozilla/5.0'}});
    if(!r.ok && r.status!==206) throw new Error('Falha ao abrir a gravação: '+r.status);
    res.status(r.status);
    ['content-type','content-length','content-range','accept-ranges'].forEach(h=>{
      const v=r.headers.get(h); if(v) res.setHeader(h,v);
    });
    res.setHeader('Cache-Control','no-store');
    if(!r.body) return res.end();
    const {Readable}=require('stream');
    Readable.fromWeb(r.body).pipe(res);
  }catch(e){console.error(e);res.status(502).send(e.message)}
});

app.get('/status',(_,res)=>res.json({ok:true,mode:'approval-preview',published:false,transitionAt:TRANSITION_AT,cut:CUT,voice:'Jonathan-original'}));

app.get('/',(_,res)=>{
  res.type('html').send(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Prévia Rico CPA • Baú de 50</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#050608;color:#fff;font-family:Inter,Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:18px}.wrap{width:min(94vw,540px)}.top{text-align:center;margin-bottom:12px}.badge{display:inline-block;padding:7px 11px;border:1px solid #30343a;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#cfd3d8}.top h1{font-size:21px;margin:10px 0 4px}.top p{margin:0;color:#9da3aa;font-size:13px}.stage{position:relative;aspect-ratio:9/16;background:#000;border-radius:20px;overflow:hidden;box-shadow:0 20px 70px #000}.stage video{position:absolute;background:#000}.stage #main{width:118%;height:118%;left:-6%;top:-5%;object-fit:cover}.stage #demo{inset:0;width:100%;height:100%;object-fit:contain}.hidden{display:none}.transition{position:absolute;inset:0;display:none;align-items:center;justify-content:center;text-align:center;padding:36px;background:radial-gradient(circle at 50% 40%,#1b1e24ee 0,#090a0df2 60%,#000f 100%);z-index:4;pointer-events:none}.transition.on{display:flex}.transition .red{color:#ff3556;font-weight:900;letter-spacing:.12em;font-size:13px}.transition h2{font-size:42px;line-height:.95;margin:13px 0 16px}.transition p{font-size:15px;color:#d6d8dc;line-height:1.5}.demo-label{position:absolute;left:16px;right:16px;top:16px;z-index:3;background:#06070acc;border:1px solid #34373d;border-radius:12px;padding:10px;text-align:center;font-weight:900;font-size:12px;letter-spacing:.08em;display:none}.demo-label.on{display:block}.controls{margin-top:14px;display:grid;gap:8px}.btn{border:0;border-radius:13px;padding:15px 16px;font-weight:900;font-size:15px;cursor:pointer}.btn.primary{background:#fff;color:#050608}.btn.secondary{background:#17191d;color:#fff;border:1px solid #2b2e34}.msg{font-size:12px;text-align:center;color:#9ca2aa;min-height:18px;margin-top:8px}.ok{color:#9cffb4}
</style></head>
<body><div class="wrap">
  <div class="top"><span class="badge">PRÉVIA PARA APROVAÇÃO</span><h1>Rico CPA • Baú de 50</h1><p>Nada desta versão foi publicado na Central.</p></div>
  <div class="stage">
    <video id="main" playsinline preload="metadata" src="${MAIN_VIDEO}"></video>
    <div id="transition" class="transition"><div><div class="red">DEMONSTRAÇÃO PRÁTICA</div><h2>BAÚ DE 50</h2><p>A seguir, você acompanha na prática como esse processo acontece dentro da operação.</p></div></div>
    <video id="demo" class="hidden" playsinline preload="metadata" src="/demo.mp4"></video>
    <div id="label" class="demo-label">BAÚ DE 50 • DEMONSTRAÇÃO NA PRÁTICA</div>
  </div>
  <div class="controls"><button id="play" class="btn primary">▶ ASSISTIR PRÉVIA COMPLETA</button><button id="restart" class="btn secondary">↻ RECOMEÇAR</button></div>
  <div id="msg" class="msg">A transição usa a própria voz Jonathan do vídeo original.</div>
</div>
<script>
const main=document.getElementById('main'),demo=document.getElementById('demo'),transition=document.getElementById('transition'),label=document.getElementById('label'),play=document.getElementById('play'),restart=document.getElementById('restart'),msg=document.getElementById('msg');
const TRANSITION_AT=${TRANSITION_AT},CUT=${CUT};
let inserted=false,transitionShown=false;
function showMain(){demo.pause();demo.classList.add('hidden');label.classList.remove('on');transition.classList.remove('on');main.classList.remove('hidden')}
function showTransition(){transitionShown=true;transition.classList.add('on');msg.textContent='Jonathan continua narrando com a voz original…'}
function showDemo(){main.pause();transition.classList.remove('on');main.classList.add('hidden');demo.classList.remove('hidden');label.classList.add('on');demo.currentTime=0;demo.play().catch(()=>{msg.textContent='Toque em ASSISTIR PRÉVIA novamente para liberar o áudio.'})}
function insertDemo(){if(inserted)return;inserted=true;showDemo()}
main.addEventListener('timeupdate',()=>{if(!transitionShown&&main.currentTime>=TRANSITION_AT&&main.currentTime<CUT)showTransition();if(!inserted&&main.currentTime>=CUT)insertDemo()});
demo.addEventListener('ended',()=>{showMain();transitionShown=true;main.currentTime=CUT+.06;main.play();msg.innerHTML='<span class="ok">Demonstração concluída. Continuando o vídeo original…</span>'});
main.addEventListener('ended',()=>{msg.innerHTML='<span class="ok">Prévia concluída ✓</span>';play.textContent='▶ ASSISTIR NOVAMENTE'});
play.onclick=()=>{if(main.ended||main.currentTime>=main.duration-.2){inserted=false;transitionShown=false;main.currentTime=0}showMain();main.play();play.textContent='⏸ TOQUE NO VÍDEO PARA PAUSAR';msg.textContent='Reproduzindo a versão para aprovação…'};
main.onclick=()=>main.paused?main.play():main.pause();demo.onclick=()=>demo.paused?demo.play():demo.pause();
restart.onclick=()=>{inserted=false;transitionShown=false;demo.pause();main.pause();main.currentTime=0;demo.currentTime=0;showMain();msg.textContent='Prévia reiniciada. Toque em ASSISTIR PRÉVIA COMPLETA.';play.textContent='▶ ASSISTIR PRÉVIA COMPLETA'};
</script></body></html>`);
});

app.listen(port,()=>console.log('Rico CPA approval preview online',port));
