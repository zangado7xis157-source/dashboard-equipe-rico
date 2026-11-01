const express=require('express');
const {Readable}=require('stream');
const app=express();
const port=process.env.PORT||10000;
const CLIP_SHARE='https://share.descript.com/view/yuypoFGx5YP';
const MAIN_VIDEO='https://rico-video-assets-temp.onrender.com/Rico_CPA_V3_EXPLICATIVO_PRO.mp4';

async function directVideoUrl(shareUrl){
  const r=await fetch(shareUrl,{redirect:'follow'});
  if(!r.ok)throw new Error('Falha ao consultar vídeo');
  const html=await r.text();
  const m=html.match(/property="descript:video" content="([^"]+)"/i);
  if(!m)throw new Error('Arquivo de vídeo não encontrado');
  return m[1].replace(/&amp;/g,'&').replace(/&#x3D;/g,'=');
}

async function proxyVideo(req,res,shareUrl){
  try{
    const url=await directVideoUrl(shareUrl);
    const headers={};
    if(req.headers.range)headers.Range=req.headers.range;
    const upstream=await fetch(url,{headers,redirect:'follow'});
    res.status(upstream.status);
    for(const h of ['content-type','content-length','content-range','accept-ranges','etag','last-modified']){
      const v=upstream.headers.get(h); if(v)res.setHeader(h,v);
    }
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Cache-Control','public,max-age=300');
    if(!upstream.body)return res.end();
    Readable.fromWeb(upstream.body).pipe(res);
  }catch(err){
    console.error('proxy',err);
    res.status(502).send('Vídeo temporariamente indisponível');
  }
}

app.get('/clip.mp4',(req,res)=>proxyVideo(req,res,CLIP_SHARE));

app.get('/',(req,res)=>res.type('html').send(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#050608">
<title>Prévia Rico CPA • Baú de 50</title>
<style>
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0,rgba(255,48,76,.12),transparent 28%),#050608;color:#fff;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;min-height:100vh}.wrap{width:min(980px,calc(100% - 28px));margin:auto;padding:28px 0 50px}.top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}.brand{font-weight:1000;letter-spacing:.5px}.badge{font-size:10px;font-weight:900;letter-spacing:1.4px;padding:8px 10px;border:1px solid #3b424e;border-radius:999px;color:#b8c0cd;background:#0b0f15}.card{border:1px solid #252c36;background:linear-gradient(180deg,#0e1218,#080b10);border-radius:24px;padding:20px;box-shadow:0 28px 80px #0008}.head{text-align:center;margin-bottom:18px}.head small{color:#ff6c80;font-weight:900;letter-spacing:1.8px}.head h1{margin:8px 0 8px;font-size:clamp(28px,6vw,46px);line-height:1}.head p{margin:0;color:#9ba6b5;line-height:1.55}.stage{position:relative;width:min(430px,100%);margin:0 auto;aspect-ratio:9/14.2;background:#000;border-radius:18px;overflow:hidden;border:1px solid #2b313c;box-shadow:0 20px 55px rgba(0,0,0,.5)}.stage video{position:absolute;inset:0;width:100%;height:100%;background:#000;object-fit:cover;object-position:center top}.hide{display:none!important}.transition{position:absolute;inset:0;z-index:10;background:radial-gradient(circle at 50% 35%,#25101a 0,#090b10 55%,#020304 100%);display:flex;align-items:center;justify-content:center;text-align:center;padding:30px;opacity:0;pointer-events:none;transition:opacity .25s}.transition.show{opacity:1;pointer-events:auto}.transition .inner{max-width:330px}.transition .kicker{font-size:10px;letter-spacing:2.4px;color:#ff6177;font-weight:1000;margin-bottom:12px}.transition h2{font-size:31px;line-height:1.05;margin:0 0 14px}.transition p{color:#c5ccd7;font-size:13px;line-height:1.55;margin:0}.transition button{margin-top:20px;width:100%;border:0;border-radius:13px;padding:14px 16px;background:#fff;color:#08090b;font-weight:1000;font-size:13px;cursor:pointer}.controls{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:16px}.controls button{border:1px solid #303844;background:#111720;color:#fff;border-radius:11px;padding:11px 14px;font-weight:900;cursor:pointer}.controls .primary{background:#fff;color:#07090c;border-color:#fff}.note{margin-top:15px;text-align:center;color:#7f8997;font-size:11px;line-height:1.5}.status{text-align:center;margin-top:11px;font-size:12px;color:#aab4c2}.status b{color:#fff}
</style>
</head>
<body>
<main class="wrap">
  <div class="top"><div class="brand">RICO CPA • PRÉVIA</div><div class="badge">NÃO PUBLICADO NO SITE</div></div>
  <section class="card">
    <div class="head"><small>REVISÃO DO VÍDEO</small><h1>Demonstração prática do Baú de 50</h1><p>Assista do começo ao fim. A prévia entra depois da Mentoria e volta normalmente para o Bot Beta.</p></div>
    <div class="stage">
      <video id="main" playsinline preload="metadata" src="${MAIN_VIDEO}"></video>
      <video id="clip" class="hide" playsinline preload="metadata" src="/clip.mp4"></video>
      <div id="transition" class="transition"><div class="inner"><div class="kicker">DEMONSTRAÇÃO PRÁTICA</div><h2>BAÚ DE 50</h2><p>Neste momento, eu vou demonstrar na prática o funcionamento do Baú de 50, para que você entenda de forma clara como esse processo é executado dentro da operação.</p><button id="continueBtn">VER DEMONSTRAÇÃO</button></div></div>
    </div>
    <div class="controls"><button class="primary" id="play">▶ ASSISTIR PRÉVIA</button><button id="restart">↻ RECOMEÇAR</button></div>
    <div id="status" class="status">A demonstração entra automaticamente por volta de <b>22 segundos</b>.</div>
    <div class="note">Esta é somente uma prévia para sua aprovação. O site principal continua com o vídeo anterior.</div>
  </section>
</main>
<script>
const main=document.getElementById('main');
const clip=document.getElementById('clip');
const trans=document.getElementById('transition');
const play=document.getElementById('play');
const restart=document.getElementById('restart');
const continueBtn=document.getElementById('continueBtn');
const status=document.getElementById('status');
const CUT=22.42;
let inserted=false,transitioning=false;
const phrase='Neste momento, eu vou demonstrar na prática o funcionamento do Baú de 50, para que você entenda de forma clara como esse processo é executado dentro da operação.';
function pickVoice(){const vs=speechSynthesis?.getVoices?.()||[];return vs.find(v=>/pt-BR/i.test(v.lang)&&/male|mascul|antonio|daniel|felipe|lucas|paulo/i.test(v.name))||vs.find(v=>/pt-BR/i.test(v.lang))||null}
function speakIntro(){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(phrase);u.lang='pt-BR';u.rate=.93;u.pitch=.96;const v=pickVoice();if(v)u.voice=v;speechSynthesis.speak(u)}catch(e){}}
function showTransition(){if(transitioning||inserted)return;transitioning=true;main.pause();main.currentTime=CUT;trans.classList.add('show');status.innerHTML='Trecho da <b>Mentoria concluído</b>. Agora entra a demonstração prática.';speakIntro()}
function startClip(){trans.classList.remove('show');clip.classList.remove('hide');main.classList.add('hide');clip.currentTime=0;clip.play().catch(()=>{});status.innerHTML='Reproduzindo sua <b>demonstração do Baú de 50</b>.'}
function resumeMain(){inserted=true;transitioning=false;clip.pause();clip.classList.add('hide');main.classList.remove('hide');main.currentTime=CUT+.08;main.play().catch(()=>{});status.innerHTML='Demonstração concluída. O vídeo voltou para o <b>Bot Beta</b> e continua normalmente.'}
main.addEventListener('timeupdate',()=>{if(!inserted&&!transitioning&&main.currentTime>=CUT)showTransition()});
clip.addEventListener('ended',resumeMain);
continueBtn.addEventListener('click',startClip);
play.addEventListener('click',()=>{if(trans.classList.contains('show')){startClip();return} if(!clip.classList.contains('hide')){clip.play();return} main.play();play.textContent='▶ CONTINUAR'});
restart.addEventListener('click',()=>{try{speechSynthesis.cancel()}catch(e){};inserted=false;transitioning=false;clip.pause();clip.currentTime=0;clip.classList.add('hide');trans.classList.remove('show');main.classList.remove('hide');main.currentTime=0;main.pause();status.innerHTML='A demonstração entra automaticamente por volta de <b>22 segundos</b>.';play.textContent='▶ ASSISTIR PRÉVIA'});
</script>
</body></html>`));

app.get('/health',(_,res)=>res.json({ok:true,preview:true}));
app.listen(port,()=>console.log('Rico video preview online',port));
