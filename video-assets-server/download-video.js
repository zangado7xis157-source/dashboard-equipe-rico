const fs=require('fs');
const path=require('path');

(async()=>{
  const url=process.env.VIDEO_FINAL_URL;
  if(!url){console.log('VIDEO_FINAL_URL ausente; seguindo sem vídeo.');return;}
  const out=path.join(__dirname,'Rico_CPA_V2_Final.mp4');
  try{
    const r=await fetch(url,{redirect:'follow'});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const ab=await r.arrayBuffer();
    fs.writeFileSync(out,Buffer.from(ab));
    console.log('Vídeo salvo:',out,fs.statSync(out).size,'bytes');
  }catch(err){
    console.error('Falha ao baixar vídeo promocional:',err.message);
    process.exitCode=1;
  }
})();
