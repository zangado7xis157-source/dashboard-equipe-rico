const fs=require('fs');
const path=require('path');
const {spawn}=require('child_process');
const ffmpegPath=require('ffmpeg-static');

const MAIN_SOURCE='https://rico-video-assets-temp.onrender.com/Rico_CPA_V3_EXPLICATIVO_PRO.mp4';
const DEMO_SOURCE='https://at.adobe.com/qAUNMnr2IVM5l7Ao';
const OUT_DIR=path.join(__dirname,'public');
const TMP_DIR=path.join(__dirname,'.build-tmp');

fs.mkdirSync(OUT_DIR,{recursive:true});
fs.mkdirSync(TMP_DIR,{recursive:true});

async function download(url,target){
  console.log('Downloading',url);
  const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0','accept':'video/*,*/*'}});
  if(!r.ok||!r.body)throw new Error(`Download failed ${r.status} for ${url}`);
  const file=fs.createWriteStream(target);
  const {Readable}=require('stream');
  await new Promise((resolve,reject)=>{
    Readable.fromWeb(r.body).pipe(file);
    file.on('finish',resolve);file.on('error',reject);
  });
  const size=fs.statSync(target).size;
  if(size<10000)throw new Error(`Downloaded file too small: ${size}`);
  console.log('Downloaded',size,'bytes');
}

function transcode(input,output,filter){
  return new Promise((resolve,reject)=>{
    const args=['-y','-i',input,'-vf',filter,'-r','30','-c:v','libx264','-preset','veryfast','-crf','24','-maxrate','1800k','-bufsize','3600k','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',output];
    console.log('Transcoding',path.basename(input),'->',path.basename(output));
    const p=spawn(ffmpegPath,args,{stdio:['ignore','ignore','pipe']});
    let err='';
    p.stderr.on('data',d=>{err+=d.toString();if(err.length>30000)err=err.slice(-30000)});
    p.on('error',reject);
    p.on('close',code=>{
      if(code===0&&fs.existsSync(output)&&fs.statSync(output).size>10000){
        console.log('Ready',path.basename(output),fs.statSync(output).size,'bytes');
        resolve();
      }else reject(new Error('FFmpeg failed: '+err.slice(-5000)));
    });
  });
}

(async()=>{
  const mainRaw=path.join(TMP_DIR,'main-source.mp4');
  const demoRaw=path.join(TMP_DIR,'demo-source.mov');
  const mainOut=path.join(OUT_DIR,'main-clean.mp4');
  const demoOut=path.join(OUT_DIR,'demo-light.mp4');

  await download(MAIN_SOURCE,mainRaw);
  await transcode(mainRaw,mainOut,"scale=720:-2:flags=lanczos,drawbox=x=0:y=ih-250:w=340:h=250:color=black@1:t=fill");

  await download(DEMO_SOURCE,demoRaw);
  await transcode(demoRaw,demoOut,'scale=720:-2:flags=lanczos');

  console.log('All preview assets ready');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
