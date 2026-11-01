const express=require('express');
const sharp=require('sharp');
const {Readable}=require('stream');
const app=express(); const port=process.env.PORT||10000;
const P={
 central:{c:'#ff304c',t:'RICO CPA — CENTRAL OFICIAL',s:'Todas as ferramentas da Equipe Rico em um só lugar',items:['Dashboard Equipe Rico','Mentoria Baú de 50','Bot Beta','Rico Proxy','Lista Prime','Rico Browser Android']},
 dashboard:{c:'#2388ff',t:'DASHBOARD EQUIPE RICO',s:'Painel direto para organizar e acompanhar a operação',items:['Depósitos • R$ 1.250','Saques • R$ 1.480','Baú • R$ 230','Lucro do dia • +R$ 460','Meta do dia • 83%','Ciclos finalizados • histórico']},
 mentoria:{c:'#e3173d',t:'MENTORIA BAÚ DE 50',s:'Operacional completo do começo ao fim',items:['AULA 01 — Proxy','AULA 02 — Operacional','AULA 03 — Jogos e regras da casa','AULA 04 — Quando pegar o baú','Materiais VIP','Suporte Equipe Rico']},
 bot:{c:'#f2f2f2',t:'BOT BETA',s:'Ferramenta oficial com acesso centralizado',items:['Bot Beta — Windows','Ativação por key','Liberar acesso','Download oficial','Suporte WhatsApp','Acesso vitalício']},
 proxy:{c:'#1687ff',t:'RICO PROXY',s:'Proxy residencial rotativa • somente Brasil',items:['5 GB • R$ 39,50','10 GB • R$ 71,10','25 GB • R$ 177,75','50 GB • R$ 355,50','Gerar proxy Brasil','Copiar proxy']},
 prime:{c:'#ff304c',t:'LISTA PRIME',s:'Casas e oportunidades selecionadas',items:['Casa validada 01','Casa validada 02','Casa validada 03','Casa validada 04','Links organizados','Acesso Prime']},
 browser:{c:'#ffffff',t:'RICO BROWSER ANDROID',s:'Ferramenta preparada para uso no celular',items:['Proxy','Múltiplas abas','Extensões','Speed','Navegação centralizada','Liberar download']}
};
const e=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function svg(k){const p=P[k]; let cards=''; p.items.forEach((x,i)=>{const col=i%2,row=Math.floor(i/2),X=75+col*475,Y=560+row*280;cards+=`<rect x="${X}" y="${Y}" width="430" height="230" rx="28" fill="#0d131c" stroke="#2b3544"/><rect x="${X+28}" y="${Y+28}" width="58" height="58" rx="16" fill="${p.c}" opacity=".9"/><text x="${X+110}" y="${Y+66}" font-family="Arial" font-size="25" font-weight="900" fill="#fff">${e(x)}</text><rect x="${X+28}" y="${Y+115}" width="374" height="3" fill="#24303e"/><text x="${X+28}" y="${Y+165}" font-family="Arial" font-size="17" fill="#9ba7b7">EQUIPE RICO • ACESSO OFICIAL</text><rect x="${X+28}" y="${Y+187}" width="210" height="28" rx="14" fill="${p.c}" opacity=".18"/><text x="${X+42}" y="${Y+207}" font-family="Arial" font-size="14" font-weight="800" fill="${p.c}">ABRIR / ACESSAR</text>`});
return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#05070b"/><stop offset="1" stop-color="#121823"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#g)"/><rect x="35" y="35" width="1010" height="1850" rx="34" fill="#080b10" stroke="#283141" stroke-width="2"/><rect x="35" y="35" width="1010" height="88" rx="34" fill="#11161e"/><circle cx="82" cy="79" r="10" fill="#ff5f57"/><circle cx="112" cy="79" r="10" fill="#febc2e"/><circle cx="142" cy="79" r="10" fill="#28c840"/><rect x="190" y="58" width="650" height="42" rx="12" fill="#070a0e" stroke="#252e3a"/><text x="215" y="85" font-family="Arial" font-size="18" fill="#8b96a7">Equipe Rico • página oficial</text><rect x="65" y="165" width="78" height="78" rx="20" fill="${p.c}"/><text x="104" y="218" text-anchor="middle" font-family="Arial" font-size="42" font-weight="900" fill="#080b10">R</text><text x="175" y="205" font-family="Arial" font-size="43" font-weight="900" fill="#fff">${e(p.t)}</text><text x="175" y="250" font-family="Arial" font-size="22" fill="#a5afbd">${e(p.s)}</text><rect x="65" y="300" width="950" height="5" rx="2" fill="${p.c}"/><text x="70" y="405" font-family="Arial" font-size="64" font-weight="900" fill="#fff">ACESSO OFICIAL</text><text x="70" y="458" font-family="Arial" font-size="22" fill="#8d99aa">Tela sincronizada com o trecho correspondente do vídeo.</text>${cards}<rect x="75" y="1490" width="930" height="240" rx="28" fill="#0d131c" stroke="#2b3544"/><text x="105" y="1555" font-family="Arial" font-size="22" font-weight="900" fill="${p.c}">EQUIPE RICO</text><text x="105" y="1620" font-family="Arial" font-size="38" font-weight="900" fill="#fff">${e(p.t)}</text><text x="105" y="1670" font-family="Arial" font-size="19" fill="#8e99aa">Conteúdo visual preparado para o vídeo promocional.</text><text x="540" y="1835" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#5f6b7b">RICO CPA • CENTRAL OFICIAL</text></svg>`}
function revealSvg(k){const p=P[k];return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><radialGradient id="r"><stop offset="0" stop-color="${p.c}" stop-opacity=".24"/><stop offset=".45" stop-color="#10151f" stop-opacity=".9"/><stop offset="1" stop-color="#030508"/></radialGradient><linearGradient id="l" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${p.c}" stop-opacity="0"/><stop offset=".5" stop-color="${p.c}"/><stop offset="1" stop-color="${p.c}" stop-opacity="0"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#r)"/><circle cx="540" cy="900" r="310" fill="none" stroke="${p.c}" stroke-opacity=".16" stroke-width="3"/><circle cx="540" cy="900" r="230" fill="none" stroke="${p.c}" stroke-opacity=".10" stroke-width="2"/><rect x="90" y="700" width="900" height="3" fill="url(#l)"/><text x="540" y="805" text-anchor="middle" font-family="Arial" font-size="24" font-weight="800" letter-spacing="8" fill="#aeb7c5">PRÓXIMA FUNÇÃO</text><text x="540" y="925" text-anchor="middle" font-family="Arial" font-size="56" font-weight="900" fill="#fff">${e(p.t)}</text><rect x="385" y="985" width="310" height="7" rx="4" fill="${p.c}"/><text x="540" y="1065" text-anchor="middle" font-family="Arial" font-size="23" font-weight="700" fill="#8e99aa">EQUIPE RICO • ACESSO OFICIAL</text><rect x="90" y="1160" width="900" height="3" fill="url(#l)"/><text x="540" y="1740" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" letter-spacing="4" fill="#515b69">RICO CPA</text></svg>`}
async function sendPng(req,res,markup){try{const buf=await sharp(Buffer.from(markup)).png().toBuffer();const range=req.headers.range;res.set('Content-Type','image/png');res.set('Accept-Ranges','bytes');res.set('Cache-Control','public,max-age=60');if(range){const m=/bytes=(\d+)-(\d*)/.exec(range);if(m){const start=parseInt(m[1],10),end=m[2]?parseInt(m[2],10):buf.length-1;if(start>=buf.length)return res.status(416).set('Content-Range',`bytes */${buf.length}`).end();const last=Math.min(end,buf.length-1),chunk=buf.subarray(start,last+1);res.status(206);res.set('Content-Range',`bytes ${start}-${last}/${buf.length}`);res.set('Content-Length',String(chunk.length));return res.end(chunk)}}res.set('Content-Length',String(buf.length));res.end(buf)}catch(err){console.error(err);res.status(500).end()}}
async function directVideoUrl(){
  const r=await fetch('https://share.descript.com/view/mnMJk07dfX5',{redirect:'follow'});
  if(!r.ok)throw new Error('Falha ao consultar publicação');
  const html=await r.text();
  const m=html.match(/property="descript:video" content="([^"]+)"/i);
  if(!m)throw new Error('Arquivo original não encontrado');
  return m[1].replace(/&amp;/g,'&').replace(/&#x3D;/g,'=');
}
app.get('/reveal/:name.png',(req,res)=>{if(!P[req.params.name])return res.status(404).end();return sendPng(req,res,revealSvg(req.params.name))});
app.get('/:name.png',(req,res)=>{if(!P[req.params.name])return res.status(404).end();return sendPng(req,res,svg(req.params.name))});
app.get('/Rico_CPA_V2_Final.mp4',async(req,res)=>{
  try{
    const url=await directVideoUrl();
    const headers={};
    if(req.headers.range)headers.Range=req.headers.range;
    const upstream=await fetch(url,{headers,redirect:'follow'});
    res.status(upstream.status);
    for(const h of ['content-type','content-length','content-range','accept-ranges','last-modified','etag']){
      const v=upstream.headers.get(h); if(v)res.setHeader(h,v);
    }
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Cache-Control','public,max-age=300');
    if(!upstream.body)return res.end();
    Readable.fromWeb(upstream.body).pipe(res);
  }catch(err){
    console.error('video proxy',err);
    res.status(502).send('Vídeo temporariamente indisponível');
  }
});
app.get('/',(_,res)=>res.send('Rico video assets online'));
app.listen(port,()=>console.log('online',port));
