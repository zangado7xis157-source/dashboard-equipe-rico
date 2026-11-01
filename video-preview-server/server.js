const express=require('express');
const {Readable}=require('stream');
const fs=require('fs');
const path=require('path');
const {spawn}=require('child_process');
const ffmpegPath=require('ffmpeg-static');

const app=express();
const port=process.env.PORT||10000;
const MAIN_VIDEO='https://rico-video-assets-temp.onrender.com/Rico_CPA_V3_EXPLICATIVO_PRO.mp4';
const CLIP_SHARE='https://share.descript.com/view/AkwOxO5O5gg';
const CUT=22.45;
const TMP='/tmp/rico-bau50-preview';
const FINAL=path.join(TMP,'Rico_CPA_PREVIA_BAU50_SEM_MARCA.mp4');
const phrase='Neste momento, eu vou demonstrar na prática o funcionamento do Baú de 50, para que você entenda de forma clara como esse processo é executado dentro da operação.';
let buildPromise=null;

fs.mkdirSync(TMP,{recursive:true});

async function directVideoUrl(shareUrl){
  const r=await fetch(shareUrl,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0'}});
  if(!r.ok)throw new Error('Falha ao consultar vídeo: '+r.status);
  const html=await r.text();
  const m=html.match(/property="descript:video" content="([^"]+)"/i);
  if(!m)throw new Error('Arquivo do vídeo não encontrado');
  return m[1].replace(/&amp;/g,'&').replace(/&#x3D;/g,'=');
}

async function download(url,file){
  if(fs.existsSync(file)&&fs.statSync(file).size>100000)return file;
  const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0'}});
  if(!r.ok)throw new Error('Falha no download '+r.status+' '+url);
  const out=fs.createWriteStream(file);
  await new Promise((resolve,reject)=>{
    if(!r.body)return reject(new Error('Download sem corpo'));
    const s=Readable.fromWeb(r.body);
    s.pipe(out);
    s.on('error',reject); out.on('error',reject); out.on('finish',resolve);
  });
  return file;
}

async function run(args,label){
  await new Promise((resolve,reject)=>{
    const p=spawn(ffmpegPath,args,{stdio:['ignore','ignore','pipe']});
    let err='';
    p.stderr.on('data',d=>{err+=d.toString(); if(err.length>28000)err=err.slice(-28000)});
    p.on('error',reject);
    p.on('close',code=>code===0?resolve():reject(new Error(label+' ffmpeg '+code+'\n'+err.slice(-5000))));
  });
}

async function getNarration(){
  const file=path.join(TMP,'narracao.mp3');
  if(fs.existsSync(file)&&fs.statSync(file).size>10000)return file;
  const q=encodeURIComponent(phrase);
  const urls=[
    `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=pt-BR&q=${q}`,
    `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=pt-BR&q=${q}`
  ];
  for(const u of urls){
    try{
      const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0'}});
      if(r.ok){
        fs.writeFileSync(file,Buffer.from(await r.arrayBuffer()));
        if(fs.statSync(file).size>10000)return file;
      }
    }catch(e){console.error('tts',e.message)}
  }
  throw new Error('Não foi possível gerar a narração');
}

async function ensureFinal(){
  if(fs.existsSync(FINAL)&&fs.statSync(FINAL).size>500000)return FINAL;
  if(buildPromise)return buildPromise;
  buildPromise=(async()=>{
    const source=path.join(TMP,'source.mp4');
    const rawDemo=path.join(TMP,'demo_raw.mp4');
    const narration=await getNarration();
    await download(MAIN_VIDEO,source);
    const clipUrl=await directVideoUrl(CLIP_SHARE);
    await download(clipUrl,rawDemo);

    const pre=path.join(TMP,'pre.mp4');
    const frame=path.join(TMP,'frame.jpg');
    const intro=path.join(TMP,'intro.mp4');
    const demo=path.join(TMP,'demo.mp4');
    const post=path.join(TMP,'post.mp4');

    await run(['-y','-i',source,'-t',String(CUT),
      '-vf','scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30,format=yuv420p',
      '-af','aresample=48000','-ac','2','-c:v','libx264','-preset','veryfast','-crf','19','-c:a','aac','-b:a','192k','-movflags','+faststart',pre],'pre');

    await run(['-y','-ss','22.20','-i',source,'-frames:v','1',frame],'frame');
    await run(['-y','-loop','1','-i',frame,'-i',narration,
      '-vf','scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,gblur=sigma=7,eq=brightness=-0.34,setsar=1,fps=30,format=yuv420p',
      '-af','aresample=48000,volume=1.18','-ac','2','-shortest','-c:v','libx264','-preset','veryfast','-crf','19','-c:a','aac','-b:a','192k','-movflags','+faststart',intro],'intro');

    await run(['-y','-i',rawDemo,
      '-filter_complex','[0:v]split=2[bg][fg];[bg]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,gblur=sigma=28,eq=brightness=-0.38[bg2];[fg]scale=690:690:force_original_aspect_ratio=decrease[fg2];[bg2][fg2]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30,format=yuv420p[v];[0:a]aresample=48000,volume=0.78[a]',
      '-map','[v]','-map','[a]','-ac','2','-c:v','libx264','-preset','veryfast','-crf','19','-c:a','aac','-b:a','192k','-movflags','+faststart',demo],'demo');

    await run(['-y','-ss',String(CUT),'-i',source,
      '-vf','scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30,format=yuv420p',
      '-af','aresample=48000','-ac','2','-c:v','libx264','-preset','veryfast','-crf','19','-c:a','aac','-b:a','192k','-movflags','+faststart',post],'post');

    await run(['-y','-i',pre,'-i',intro,'-i',demo,'-i',post,
      '-filter_complex','[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a]concat=n=4:v=1:a=1[v][a]',
      '-map','[v]','-map','[a]','-c:v','libx264','-preset','veryfast','-crf','19','-c:a','aac','-b:a','192k','-movflags','+faststart',FINAL],'concat');

    console.log('FINAL_READY',fs.statSync(FINAL).size);
    return FINAL;
  })().finally(()=>buildPromise=null);
  return buildPromise;
}

function serveMp4(req,res,file){
  const stat=fs.statSync(file),size=stat.size,range=req.headers.range;
  res.setHeader('Content-Type','video/mp4');
  res.setHeader('Accept-Ranges','bytes');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Disposition','inline; filename="Rico_CPA_PREVIA_BAU50_SEM_MARCA.mp4"');
  if(range){
    const m=/bytes=(\d+)-(\d*)/.exec(range); if(!m)return res.status(416).end();
    const start=parseInt(m[1],10),end=m[2]?Math.min(parseInt(m[2],10),size-1):size-1;
    if(start>=size){res.status(416);res.setHeader('Content-Range',`bytes */${size}`);return res.end()}
    res.status(206); res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`); res.setHeader('Content-Length',end-start+1);
    return fs.createReadStream(file,{start,end}).pipe(res);
  }
  res.setHeader('Content-Length',size); fs.createReadStream(file).pipe(res);
}

app.get('/Rico_CPA_PREVIA_BAU50_SEM_MARCA.mp4',async(req,res)=>{
  try{serveMp4(req,res,await ensureFinal())}catch(err){console.error(err);res.status(503).send('Prévia ainda indisponível: '+err.message)}
});
app.get('/status',(_,res)=>res.json({ok:true,ready:fs.existsSync(FINAL)&&fs.statSync(FINAL).size>500000,building:!!buildPromise}));
app.get('/',(_,res)=>res.type('html').send(`<!doctype html><meta charset="utf-8"><title>Prévia Rico CPA</title><style>body{margin:0;background:#050608;color:white;font-family:Arial;display:grid;place-items:center;min-height:100vh}.box{width:min(92vw,520px);text-align:center}video{width:100%;max-height:78vh;background:#000;border-radius:18px}a{display:inline-block;margin-top:14px;padding:13px 18px;border-radius:12px;background:white;color:#050608;text-decoration:none;font-weight:900}</style><div class="box"><h2>Rico CPA • Prévia Baú de 50</h2><p>Versão para aprovação. Nada foi alterado no site principal.</p><video controls playsinline src="/Rico_CPA_PREVIA_BAU50_SEM_MARCA.mp4"></video><br><a href="/Rico_CPA_PREVIA_BAU50_SEM_MARCA.mp4">ABRIR VÍDEO</a></div>`));

app.listen(port,()=>{
  console.log('Rico Bau 50 preview renderer online',port);
  setTimeout(()=>ensureFinal().catch(err=>console.error('prewarm',err)),1500);
});
