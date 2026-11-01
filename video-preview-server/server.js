const express=require('express');
const fs=require('fs');
const {Readable}=require('stream');
const {pipeline}=require('stream/promises');
const {spawn}=require('child_process');
const ffmpegPath=require('ffmpeg-static');

const app=express();
const port=process.env.PORT||10000;

const MAIN_SOURCE='https://rico-video-assets-temp.onrender.com/Rico_CPA_V3_EXPLICATIVO_PRO.mp4';
const DEMO_SOURCE='https://at.adobe.com/qAUNMnr2IVM5l7Ao';
const CUT=22.45;
const PHRASE='Neste momento, eu vou demonstrar na prática o funcionamento do Baú de 50, para que você entenda de forma clara como esse processo é executado dentro da operação.';

const MAIN_RAW='/tmp/rico-main-raw.mp4';
const MAIN_OPT='/tmp/rico-main-clean-720.mp4';
const DEMO_RAW='/tmp/rico-demo-original.mov';
const DEMO_OPT='/tmp/rico-demo-720.mp4';
let mainJob=null,demoJob=null;

async function downloadTo(url,target,minimum=10000){
  if(fs.existsSync(target)&&fs.statSync(target).size>minimum)return target;
  const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0','accept':'video/*,*/*'}});
  if(!r.ok||!r.body)throw new Error('Falha ao baixar mídia: HTTP '+r.status);
  const tmp=target+'.part';
  try{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}catch{}
  await pipeline(Readable.fromWeb(r.body),fs.createWriteStream(tmp));
  const size=fs.statSync(tmp).size;
  if(size<minimum)throw new Error('Mídia incompleta: '+size+' bytes');
  fs.renameSync(tmp,target);
  return target;
}

function transcode(input,output,filter){
  return new Promise((resolve,reject)=>{
    const args=['-y','-i',input,'-vf',filter,'-r','30','-c:v','libx264','-preset','veryfast','-crf','24','-maxrate','1800k','-bufsize','3600k','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',output];
    const p=spawn(ffmpegPath,args,{stdio:['ignore','ignore','pipe']});
    let err='';
    p.stderr.on('data',d=>{err+=d.toString();if(err.length>24000)err=err.slice(-24000)});
    p.on('error',reject);
    p.on('close',code=>{
      if(code===0&&fs.existsSync(output)&&fs.statSync(output).size>10000)return resolve(output);
      reject(new Error('Falha ao otimizar vídeo: '+err.slice(-3500)));
    });
  });
}

async function ensureMain(){
  if(fs.existsSync(MAIN_OPT)&&fs.statSync(MAIN_OPT).size>10000)return MAIN_OPT;
  if(mainJob)return mainJob;
  mainJob=(async()=>{
    const raw=await downloadTo(MAIN_SOURCE,MAIN_RAW,100000);
    // Marca do Descript fica no canto inferior esquerdo do vídeo principal.
    // A caixa preta é aplicada nos pixels do arquivo, então continua removida em tela cheia.
    const filter="scale=720:-2:flags=lanczos,drawbox=x=0:y=ih-250:w=330:h=250:color=black@1:t=fill";
    const out=await transcode(raw,MAIN_OPT,filter);
    console.log('Main optimized',fs.statSync(out).size);
    return out;
  })().catch(e=>{mainJob=null;try{if(fs.existsSync(MAIN_OPT))fs.unlinkSync(MAIN_OPT)}catch{};throw e});
  return mainJob;
}

async function ensureDemo(){
  if(fs.existsSync(DEMO_OPT)&&fs.statSync(DEMO_OPT).size>10000)return DEMO_OPT;
  if(demoJob)return demoJob;
  demoJob=(async()=>{
    const raw=await downloadTo(DEMO_SOURCE,DEMO_RAW,100000);
    const filter='scale=720:-2:flags=lanczos';
    const out=await transcode(raw,DEMO_OPT,filter);
    console.log('Demo optimized',fs.statSync(out).size);
    return out;
  })().catch(e=>{demoJob=null;try{if(fs.existsSync(DEMO_OPT))fs.unlinkSync(DEMO_OPT)}catch{};throw e});
  return demoJob;
}

function sendVideo(res,file){
  res.setHeader('Cache-Control','public, max-age=3600');
  res.setHeader('Content-Type','video/mp4');
  res.sendFile(file);
}

app.get('/main.mp4',async(req,res)=>{try{sendVideo(res,await ensureMain())}catch(e){console.error(e);res.status(502).send(e.message)}});
app.get('/demo.mp4',async(req,res)=>{try{sendVideo(res,await ensureDemo())}catch(e){console.error(e);res.status(502).send(e.message)}});
app.get('/status',async(req,res)=>{
  try{
    const [m,d]=await Promise.all([ensureMain(),ensureDemo()]);
    res.json({ok:true,published:false,mainWatermarkRemoved:true,mainBytes:fs.statSync(m).size,demoSource:'original-upload',demoOptimized:true,demoBytes:fs.statSync(d).size,phraseBeforeDemo:true,voiceMode:'browser-Marcos-preferred',cut:CUT});
  }catch(e){res.status(500).json({ok:false,error:e.message})}
});

app.get('/',(_,res)=>{
res.type('html').send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Prévia Rico CPA • Baú de 50</title><style>
*{box-sizing:border-box}body{margin:0;background:#050608;color:#fff;font-family:Inter,Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:18px}.wrap{width:min(94vw,540px)}.top{text-align:center;margin-bottom:12px}.badge{display:inline-block;padding:7px 11px;border:1px solid #30343a;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#cfd3d8}.top h1{font-size:21px;margin:10px 0 4px}.top p{margin:0;color:#9da3aa;font-size:13px}.stage{position:relative;aspect-ratio:9/16;background:#000;border-radius:20px;overflow:hidden;box-shadow:0 20px 70px #000}.stage video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}.hidden{display:none}.transition{position:absolute;inset:0;display:none;align-items:center;justify-content:center;text-align:center;padding:36px;background:radial-gradient(circle at 50% 40%,#1b1e24 0,#090a0d 60%,#000 100%);z-index:20}.transition.on{display:flex}.transition .red{color:#ff3556;font-weight:900;letter-spacing:.12em;font-size:13px}.transition h2{font-size:42px;line-height:.95;margin:13px 0 16px}.transition p{font-size:15px;color:#fff;line-height:1.55}.demo-label{position:absolute;left:16px;right:16px;top:16px;z-index:3;background:#06070acc;border:1px solid #34373d;border-radius:12px;padding:10px;text-align:center;font-weight:900;font-size:12px;letter-spacing:.08em;display:none}.demo-label.on{display:block}.controls{margin-top:14px;display:grid;gap:8px}.btn{border:0;border-radius:13px;padding:15px 16px;font-weight:900;font-size:15px;cursor:pointer}.btn.primary{background:#fff;color:#050608}.btn.secondary{background:#17191d;color:#fff;border:1px solid #2b2e34}.msg{font-size:12px;text-align:center;color:#9ca2aa;min-height:18px;margin-top:8px}.ok{color:#9cffb4}.bad{color:#ff8585}
</style></head><body><div class="wrap"><div class="top"><span class="badge">PRÉVIA PARA APROVAÇÃO</span><h1>Rico CPA • Baú de 50</h1><p>Nada desta versão foi publicado na Central.</p></div><div class="stage">
<video id="main" playsinline preload="auto" src="/main.mp4?v=clean2"></video>
<div id="transition" class="transition"><div><div class="red">DEMONSTRAÇÃO PRÁTICA</div><h2>BAÚ DE 50</h2><p>${PHRASE}</p></div></div>
<video id="demo" class="hidden" playsinline preload="auto" src="/demo.mp4?v=light2"></video>
<div id="label" class="demo-label">BAÚ DE 50 • DEMONSTRAÇÃO NA PRÁTICA</div>
</div><div class="controls"><button id="play" class="btn primary">▶ ASSISTIR PRÉVIA COMPLETA</button><button id="restart" class="btn secondary">↻ RECOMEÇAR</button></div><div id="msg" class="msg">Vídeos otimizados para tocar mais leve no navegador.</div></div>
<script>
const main=document.getElementById('main'),demo=document.getElementById('demo'),transition=document.getElementById('transition'),label=document.getElementById('label'),play=document.getElementById('play'),restart=document.getElementById('restart'),msg=document.getElementById('msg');const CUT=${CUT},PHRASE=${JSON.stringify(PHRASE)};let sequenceStarted=false,demoFinished=false,speaking=false;

function voices(){return speechSynthesis.getVoices()||[]}
function chooseVoice(){
  const all=voices();
  const br=all.filter(v=>/pt[-_]?BR/i.test(v.lang||'')||/portugu.*brasil|brazilian portuguese/i.test(v.name||''));
  return br.find(v=>/marcos/i.test(v.name||''))
    || all.find(v=>/marcos/i.test(v.name||''))
    || br.find(v=>/antonio|antônio|daniel|felipe|paulo|ricardo|natural|online/i.test(v.name||''))
    || br[0]
    || all.find(v=>/^pt/i.test(v.lang||''))
    || null;
}
function waitVoices(){return new Promise(resolve=>{if(voices().length)return resolve();let done=false;const finish=()=>{if(done)return;done=true;resolve()};speechSynthesis.addEventListener('voiceschanged',finish,{once:true});setTimeout(finish,1200)})}
async function speakMarcos(){
  if(!('speechSynthesis'in window))throw new Error('Narração do navegador indisponível');
  await waitVoices();speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(PHRASE);u.lang='pt-BR';u.rate=.92;u.pitch=.96;u.volume=1;
  const v=chooseVoice();if(v)u.voice=v;
  speaking=true;
  return new Promise((resolve,reject)=>{u.onend=()=>{speaking=false;resolve()};u.onerror=e=>{speaking=false;reject(e)};speechSynthesis.speak(u);msg.textContent='Narração: '+(v?v.name:'Português Brasil')});
}
function showMain(){demo.pause();demo.classList.add('hidden');label.classList.remove('on');transition.classList.remove('on');main.classList.remove('hidden')}
async function startPhrase(){
  if(sequenceStarted)return;sequenceStarted=true;main.pause();main.currentTime=CUT;transition.classList.add('on');
  try{await speakMarcos();startDemo()}catch(e){msg.innerHTML='<span class="bad">Falha ao iniciar a narração. Toque em ASSISTIR PRÉVIA novamente.</span>';sequenceStarted=false}
}
function startDemo(){transition.classList.remove('on');main.classList.add('hidden');demo.classList.remove('hidden');label.classList.add('on');demo.currentTime=0;demo.play().then(()=>{msg.textContent='Reproduzindo sua gravação otimizada.'}).catch(()=>{msg.innerHTML='<span class="bad">Toque no vídeo para iniciar a demonstração.</span>'})}
main.addEventListener('timeupdate',()=>{if(!sequenceStarted&&main.currentTime>=CUT)startPhrase()});
demo.addEventListener('ended',()=>{demoFinished=true;showMain();main.currentTime=CUT+.08;main.play();msg.innerHTML='<span class="ok">Demonstração concluída. Continuando o vídeo original…</span>'});
main.addEventListener('ended',()=>{msg.innerHTML='<span class="ok">Prévia concluída ✓</span>';play.textContent='▶ ASSISTIR NOVAMENTE'});
play.onclick=()=>{if(speaking)return;if(main.ended||demoFinished){speechSynthesis.cancel();sequenceStarted=false;demoFinished=false;main.currentTime=0;demo.currentTime=0}showMain();main.play();play.textContent='⏸ TOQUE NO VÍDEO PARA PAUSAR';msg.textContent='Reproduzindo a versão para aprovação…'};
main.onclick=()=>main.paused?main.play():main.pause();demo.onclick=()=>demo.paused?demo.play():demo.pause();
restart.onclick=()=>{speechSynthesis.cancel();speaking=false;demo.pause();main.pause();sequenceStarted=false;demoFinished=false;main.currentTime=0;demo.currentTime=0;showMain();msg.textContent='Prévia reiniciada. Toque em ASSISTIR PRÉVIA COMPLETA.';play.textContent='▶ ASSISTIR PRÉVIA COMPLETA'};
</script></body></html>`)});

app.listen(port,()=>{
  console.log('Rico CPA optimized preview online',port);
  Promise.allSettled([ensureMain(),ensureDemo()]).then(r=>console.log('Optimized assets',r.map(x=>x.status).join(',')));
});