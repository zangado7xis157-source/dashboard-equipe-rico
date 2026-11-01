const express=require('express');
const fs=require('fs');
const {spawn}=require('child_process');
const {Readable}=require('stream');
const {pipeline}=require('stream/promises');
const ffmpegPath=require('ffmpeg-static');

const app=express();
const port=process.env.PORT||10000;
const MAIN_VIDEO='https://rico-video-assets-temp.onrender.com/Rico_CPA_V3_EXPLICATIVO_PRO.mp4';
const CLIP_SHARE='https://share.descript.com/view/AkwOxO5O5gg';
const TRANSITION_AT=13.05;
const CUT=22.45;
const VOICE_DURATION=(CUT-TRANSITION_AT).toFixed(2);
const MAIN_FILE='/tmp/rico-main-v3.mp4';
const VOICE_FILE='/tmp/jonathan-bau50.m4a';
let mainPromise=null;
let voicePromise=null;

async function ensureMainFile(){
  if(fs.existsSync(MAIN_FILE) && fs.statSync(MAIN_FILE).size>10000) return MAIN_FILE;
  if(mainPromise) return mainPromise;
  mainPromise=(async()=>{
    const r=await fetch(MAIN_VIDEO,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0','accept':'video/mp4,*/*'}});
    if(!r.ok||!r.body) throw new Error('Falha ao baixar vídeo principal: HTTP '+r.status);
    const tmp=MAIN_FILE+'.part';
    try{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}catch{}
    await pipeline(Readable.fromWeb(r.body),fs.createWriteStream(tmp));
    const size=fs.statSync(tmp).size;
    if(size<10000) throw new Error('Vídeo principal baixado incompleto: '+size+' bytes');
    fs.renameSync(tmp,MAIN_FILE);
    console.log('Main video cached',size);
    return MAIN_FILE;
  })().catch(e=>{mainPromise=null;throw e});
  return mainPromise;
}

async function ensureVoice(){
  if(fs.existsSync(VOICE_FILE) && fs.statSync(VOICE_FILE).size>1000) return VOICE_FILE;
  if(voicePromise) return voicePromise;
  voicePromise=(async()=>{
    const source=await ensureMainFile();
    return await new Promise((resolve,reject)=>{
      const args=['-y','-ss',String(TRANSITION_AT),'-i',source,'-t',String(VOICE_DURATION),'-vn','-c:a','aac','-b:a','160k',VOICE_FILE];
      const p=spawn(ffmpegPath,args,{stdio:['ignore','ignore','pipe']});
      let err='';
      p.stderr.on('data',d=>{err+=d.toString();if(err.length>16000)err=err.slice(-16000)});
      p.on('error',reject);
      p.on('close',code=>{
        if(code===0&&fs.existsSync(VOICE_FILE)&&fs.statSync(VOICE_FILE).size>1000){console.log('Jonathan voice ready',fs.statSync(VOICE_FILE).size);resolve(VOICE_FILE)}
        else reject(new Error('Falha ao extrair voz Jonathan: '+err.slice(-2500)));
      });
    });
  })().catch(e=>{voicePromise=null;try{if(fs.existsSync(VOICE_FILE))fs.unlinkSync(VOICE_FILE)}catch{};throw e});
  return voicePromise;
}

async function directVideoUrl(shareUrl){
  const r=await fetch(shareUrl,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0'}});
  if(!r.ok) throw new Error('Falha ao consultar a gravação: '+r.status);
  const html=await r.text();
  const m=html.match(/property="descript:video" content="([^"]+)"/i);
  if(!m) throw new Error('Arquivo da gravação não encontrado');
  return m[1].replace(/&amp;/g,'&').replace(/&#x3D;/g,'=');
}

app.get('/voice.m4a',async(req,res)=>{
  try{const f=await ensureVoice();res.setHeader('Cache-Control','no-store');res.type('audio/mp4');res.sendFile(f)}
  catch(e){console.error('voice route',e);res.status(502).send(e.message)}
});
app.get('/voice-status',async(req,res)=>{
  try{const f=await ensureVoice();const s=fs.statSync(f);res.json({ok:true,bytes:s.size,duration:Number(VOICE_DURATION),voice:'Jonathan-original',sourceCachedBytes:fs.statSync(MAIN_FILE).size})}
  catch(e){console.error('voice status',e);res.status(500).json({ok:false,error:e.message})}
});
app.get('/demo.mp4',async(req,res)=>{
  try{
    const url=await directVideoUrl(CLIP_SHARE);const headers={};if(req.headers.range)headers.Range=req.headers.range;
    const r=await fetch(url,{redirect:'follow',headers:{...headers,'user-agent':'Mozilla/5.0'}});
    if(!r.ok&&r.status!==206)throw new Error('Falha ao abrir a gravação: '+r.status);
    res.status(r.status);['content-type','content-length','content-range','accept-ranges'].forEach(h=>{const v=r.headers.get(h);if(v)res.setHeader(h,v)});res.setHeader('Cache-Control','no-store');if(!r.body)return res.end();Readable.fromWeb(r.body).pipe(res);
  }catch(e){console.error(e);res.status(502).send(e.message)}
});
app.get('/status',(_,res)=>res.json({ok:true,mode:'approval-preview',published:false,transitionAt:TRANSITION_AT,cut:CUT,voice:'Jonathan-extracted-original',watermark:'covered'}));

app.get('/',(_,res)=>{
res.type('html').send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Prévia Rico CPA • Baú de 50</title><style>
*{box-sizing:border-box}body{margin:0;background:#050608;color:#fff;font-family:Inter,Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:18px}.wrap{width:min(94vw,540px)}.top{text-align:center;margin-bottom:12px}.badge{display:inline-block;padding:7px 11px;border:1px solid #30343a;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#cfd3d8}.top h1{font-size:21px;margin:10px 0 4px}.top p{margin:0;color:#9da3aa;font-size:13px}.stage{position:relative;aspect-ratio:9/16;background:#000;border-radius:20px;overflow:hidden;box-shadow:0 20px 70px #000}.stage video{position:absolute;background:#000}.stage #main{width:118%;height:118%;left:-6%;top:-5%;object-fit:cover}.stage #demo{inset:0;width:100%;height:100%;object-fit:contain}.hidden{display:none}.transition{position:absolute;inset:0;display:none;align-items:center;justify-content:center;text-align:center;padding:36px;background:radial-gradient(circle at 50% 40%,#1b1e24 0,#090a0d 60%,#000 100%);z-index:6}.transition.on{display:flex}.transition .red{color:#ff3556;font-weight:900;letter-spacing:.12em;font-size:13px}.transition h2{font-size:42px;line-height:.95;margin:13px 0 16px}.transition p{font-size:15px;color:#d6d8dc;line-height:1.5}.wm-cover{position:absolute;left:0;top:0;width:170px;height:92px;background:#000;z-index:5;pointer-events:none}.wm-cover.off{display:none}.demo-label{position:absolute;left:16px;right:16px;top:16px;z-index:3;background:#06070acc;border:1px solid #34373d;border-radius:12px;padding:10px;text-align:center;font-weight:900;font-size:12px;letter-spacing:.08em;display:none}.demo-label.on{display:block}.controls{margin-top:14px;display:grid;gap:8px}.btn{border:0;border-radius:13px;padding:15px 16px;font-weight:900;font-size:15px;cursor:pointer}.btn.primary{background:#fff;color:#050608}.btn.secondary{background:#17191d;color:#fff;border:1px solid #2b2e34}.msg{font-size:12px;text-align:center;color:#9ca2aa;min-height:18px;margin-top:8px}.ok{color:#9cffb4}.bad{color:#ff8585}</style></head><body><div class="wrap"><div class="top"><span class="badge">PRÉVIA PARA APROVAÇÃO</span><h1>Rico CPA • Baú de 50</h1><p>Nada desta versão foi publicado na Central.</p></div><div class="stage"><video id="main" playsinline preload="metadata" src="${MAIN_VIDEO}"></video><div id="wm" class="wm-cover"></div><div id="transition" class="transition"><div><div class="red">DEMONSTRAÇÃO PRÁTICA</div><h2>BAÚ DE 50</h2><p>Na Mentoria Baú de 50, você acompanha o operacional do começo ao fim, com aulas de proxy, regras da casa e o que fazer quando pegar o baú.</p></div></div><video id="demo" class="hidden" playsinline preload="metadata" src="/demo.mp4"></video><div id="label" class="demo-label">BAÚ DE 50 • DEMONSTRAÇÃO NA PRÁTICA</div><audio id="voice" preload="auto" src="/voice.m4a"></audio></div><div class="controls"><button id="play" class="btn primary">▶ ASSISTIR PRÉVIA COMPLETA</button><button id="restart" class="btn secondary">↻ RECOMEÇAR</button></div><div id="msg" class="msg">A fala do Baú de 50 usa um trecho separado da voz original do Jonathan.</div></div><script>
const main=document.getElementById('main'),demo=document.getElementById('demo'),voice=document.getElementById('voice'),transition=document.getElementById('transition'),label=document.getElementById('label'),play=document.getElementById('play'),restart=document.getElementById('restart'),msg=document.getElementById('msg'),wm=document.getElementById('wm');const TRANSITION_AT=${TRANSITION_AT},CUT=${CUT};let inserted=false,transitionShown=false;
function showMain(){demo.pause();demo.classList.add('hidden');label.classList.remove('on');transition.classList.remove('on');main.classList.remove('hidden');wm.classList.remove('off')}
async function showTransition(){if(transitionShown)return;transitionShown=true;main.pause();main.currentTime=TRANSITION_AT;transition.classList.add('on');wm.classList.add('off');voice.currentTime=0;try{await voice.play();msg.textContent='Falando com a voz original do Jonathan…'}catch(e){msg.innerHTML='<span class="bad">Toque novamente em ASSISTIR PRÉVIA para liberar a fala.</span>'}}
function showDemo(){if(inserted)return;inserted=true;voice.pause();transition.classList.remove('on');main.classList.add('hidden');wm.classList.add('off');demo.classList.remove('hidden');label.classList.add('on');demo.currentTime=0;demo.play().catch(()=>{msg.textContent='Toque novamente para liberar o áudio da demonstração.'})}
main.addEventListener('timeupdate',()=>{if(!transitionShown&&main.currentTime>=TRANSITION_AT)showTransition()});voice.addEventListener('ended',()=>showDemo());voice.addEventListener('error',()=>{msg.innerHTML='<span class="bad">Falha ao carregar a voz original. Recarregue a página.</span>'});demo.addEventListener('ended',()=>{showMain();main.currentTime=CUT+.06;main.play();msg.innerHTML='<span class="ok">Demonstração concluída. Continuando o vídeo original…</span>'});main.addEventListener('ended',()=>{msg.innerHTML='<span class="ok">Prévia concluída ✓</span>';play.textContent='▶ ASSISTIR NOVAMENTE'});
play.onclick=()=>{if(transitionShown&&!inserted&&voice.paused){voice.play();return}if(main.ended||main.currentTime>=main.duration-.2){inserted=false;transitionShown=false;main.currentTime=0}showMain();main.play();play.textContent='⏸ TOQUE NO VÍDEO PARA PAUSAR';msg.textContent='Reproduzindo a versão para aprovação…'};main.onclick=()=>main.paused?main.play():main.pause();demo.onclick=()=>demo.paused?demo.play():demo.pause();restart.onclick=()=>{voice.pause();voice.currentTime=0;inserted=false;transitionShown=false;demo.pause();main.pause();main.currentTime=0;demo.currentTime=0;showMain();msg.textContent='Prévia reiniciada. Toque em ASSISTIR PRÉVIA COMPLETA.';play.textContent='▶ ASSISTIR PRÉVIA COMPLETA'};</script></body></html>`)});
app.listen(port,()=>{console.log('Rico CPA approval preview online',port);ensureVoice().catch(e=>console.error('Voice warmup failed',e.message))});