(()=>{
'use strict';

const BUILD='2026.10.23.2';
const state={period:'today',rows:[],loading:false,timer:null,resize:null,cycleTimer:null};
const $=id=>document.getElementById(id);
const db=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
const currentUser=()=>{try{return typeof user!=='undefined'&&user?.id?user:null}catch(_){return null}};
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const signed=n=>`${Number(n||0)>=0?'+':''}${money(n)}`;
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function injectStyles(){
  if($('ricoProfitChartStyles'))return;
  const s=document.createElement('style');
  s.id='ricoProfitChartStyles';
  s.textContent=`
#ricoProfitChartCard{margin:15px 0 14px;padding:22px;border:1px solid #2f3339;border-radius:20px;background:linear-gradient(145deg,#0a0c0f,#060708);box-shadow:0 20px 55px rgba(0,0,0,.28);overflow:hidden}
.rico-chart-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}.rico-chart-kicker{font-size:13px;color:#a4a9b1;font-weight:850;margin-bottom:5px}.rico-chart-big{font-size:clamp(34px,5vw,62px);line-height:.98;font-weight:950;letter-spacing:-.045em;color:#fff;text-shadow:0 0 16px rgba(255,255,255,.16)}
.rico-chart-select{min-width:120px;background:#090b0e!important;color:#fff!important;border:1px solid #343840!important;border-radius:14px!important;padding:12px 14px!important;font-weight:900!important}.rico-chart-wrap{position:relative;width:100%;height:360px;margin-top:20px}.rico-chart-wrap canvas{width:100%;height:100%;display:block}.rico-chart-empty{position:absolute;inset:0;display:none;align-items:center;justify-content:center;color:#818791;font-weight:800;font-size:13px;pointer-events:none}.rico-chart-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}.rico-chart-metric{border:1px solid #282c31;border-radius:15px;padding:15px 16px;background:#080a0d}.rico-chart-metric span{display:flex;align-items:center;gap:8px;color:#a5aab2;font-size:12px;font-weight:800}.rico-chart-dot{width:9px;height:9px;border-radius:50%;background:#f4f4f5;box-shadow:0 0 9px rgba(255,255,255,.28)}.rico-chart-metric strong{display:block;margin-top:8px;color:#fff;font-size:clamp(19px,2.2vw,28px);font-weight:950;letter-spacing:-.025em}.rico-chart-note{margin-top:9px;color:#747a83;font-size:10px}
#ricoCycleTabsBar{display:none!important}
.rico-cycle-compact{display:flex;align-items:center;gap:8px;min-height:42px;padding:0 10px;border:1px solid #343840;border-radius:11px;background:#0b0d10}.rico-cycle-compact span{font-size:10px;color:#8f959d;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.rico-cycle-compact select{min-width:130px;max-width:190px;background:#080a0d!important;color:#f4f4f5!important;border:0!important;padding:7px 28px 7px 7px!important;font-size:11px!important;font-weight:900!important;box-shadow:none!important;outline:0!important}
@media(max-width:720px){#ricoProfitChartCard{padding:16px;border-radius:16px}.rico-chart-wrap{height:280px}.rico-chart-metrics{grid-template-columns:1fr}.rico-chart-head{align-items:center}.rico-chart-big{font-size:38px}.rico-chart-select{min-width:106px}.rico-cycle-compact{width:100%;box-sizing:border-box}.rico-cycle-compact select{flex:1;max-width:none}}
`;
  document.head.appendChild(s);
}

function mount(){
  if($('ricoProfitChartCard'))return $('ricoProfitChartCard');
  const metrics=document.querySelector('.grid.metrics.dashboard-view');
  if(!metrics)return null;
  const card=document.createElement('section');
  card.id='ricoProfitChartCard';
  card.className='dashboard-view';
  card.innerHTML=`
    <div class="rico-chart-head">
      <div><div id="ricoChartKicker" class="rico-chart-kicker">Lucro do Dia</div><div id="ricoChartBig" class="rico-chart-big">+R$ 0,00</div></div>
      <select id="ricoChartPeriod" class="rico-chart-select" aria-label="Período do gráfico">
        <option value="today">Hoje</option>
        <option value="week">7 dias</option>
        <option value="month">30 dias</option>
      </select>
    </div>
    <div class="rico-chart-wrap"><canvas id="ricoProfitCanvas"></canvas><div id="ricoChartEmpty" class="rico-chart-empty">Sem lançamentos neste período.</div></div>
    <div class="rico-chart-metrics">
      <div class="rico-chart-metric"><span><i class="rico-chart-dot"></i><b id="ricoChartMetricLabel">Lucro do Dia</b></span><strong id="ricoChartProfit">R$ 0,00</strong></div>
      <div class="rico-chart-metric"><span><i class="rico-chart-dot"></i>Investimento</span><strong id="ricoChartInvestment">R$ 0,00</strong></div>
      <div class="rico-chart-metric"><span><i class="rico-chart-dot"></i>ROI</span><strong id="ricoChartRoi">0,00%</strong></div>
    </div>
    <div class="rico-chart-note">O gráfico é calculado automaticamente pelos depósitos, saques e baús registrados no dashboard.</div>`;
  metrics.insertAdjacentElement('afterend',card);
  $('ricoChartPeriod').value=state.period;
  $('ricoChartPeriod').addEventListener('change',async e=>{state.period=e.target.value;await refresh(true)});
  return card;
}

function syncCycleDock(){
  const bar=$('ricoCycleTabsBar');
  if(!bar)return;
  bar.style.display='none';
  const buttons=[...bar.querySelectorAll('[data-cycle]')];
  const head=document.querySelector('#ricoOpsV2 .rico-ops-head-right');
  if(!head||!buttons.length)return;
  let dock=$('ricoCycleCompactDock');
  if(!dock){
    dock=document.createElement('label');
    dock.id='ricoCycleCompactDock';
    dock.className='rico-cycle-compact';
    dock.innerHTML='<span>Ciclo</span><select id="ricoCycleCompactSelect" aria-label="Selecionar ciclo"></select>';
    head.insertBefore(dock,head.firstChild);
    $('ricoCycleCompactSelect').addEventListener('change',e=>{
      const target=bar.querySelector(`[data-cycle="${CSS.escape(e.target.value)}"]`);
      target?.click();
      setTimeout(()=>{refresh(true);syncCycleDock()},120);
    });
  }
  const select=$('ricoCycleCompactSelect');
  if(!select)return;
  const signature=buttons.map(b=>`${b.dataset.cycle}:${b.textContent.trim()}:${b.classList.contains('on')}`).join('|');
  if(select.dataset.signature!==signature){
    const selected=buttons.find(b=>b.classList.contains('on'))?.dataset.cycle||buttons[0]?.dataset.cycle||'';
    select.innerHTML=buttons.map(b=>`<option value="${String(b.dataset.cycle).replace(/"/g,'&quot;')}" ${b.dataset.cycle===selected?'selected':''}>${b.textContent.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;')}</option>`).join('');
    select.dataset.signature=signature;
    select.value=selected;
  }
}

function range(){
  const end=new Date();end.setHours(23,59,59,999);
  let start=new Date(end);start.setHours(0,0,0,0);
  if(state.period==='week')start.setDate(start.getDate()-6);
  if(state.period==='month')start.setDate(start.getDate()-29);
  return {start,end,startKey:localDate(start),endKey:localDate(end)};
}

async function loadRows(){
  const client=db(),u=currentUser();if(!client||!u)return [];
  const r=range();
  const res=await client.from('cpa_entries').select('id,entry_type,value,entry_date,created_at').eq('user_id',u.id).gte('entry_date',r.startKey).lte('entry_date',r.endKey).order('entry_date',{ascending:true}).order('created_at',{ascending:true});
  if(res.error){console.warn('chart load',res.error);return []}
  return res.data||[];
}

function delta(row){
  const v=Number(row?.value||0);
  if(row?.entry_type==='deposito'||row?.entry_type==='deposito_mae')return -v;
  if(row?.entry_type==='saque'||row?.entry_type==='bau')return v;
  return 0;
}

function buildSeries(rows){
  const r=range();
  let investment=0,profit=0;
  for(const x of rows){const v=Number(x.value||0);if(x.entry_type==='deposito'||x.entry_type==='deposito_mae')investment+=v;profit+=delta(x)}
  if(state.period==='today'){
    const startMs=r.start.getTime(),endMs=r.end.getTime(),pts=[{x:0,y:0}];
    let running=0;
    rows.forEach((row,i)=>{
      running+=delta(row);
      let when=row.created_at?new Date(row.created_at):null;
      let x=when&&!Number.isNaN(when.getTime())?(when.getTime()-startMs)/(endMs-startMs):(i+1)/(rows.length+1);
      x=Math.max(0,Math.min(1,x));pts.push({x,y:running});
    });
    if(rows.length)pts.push({x:1,y:running});
    return {pts,profit,investment,roi:investment?profit/investment*100:0,labels:['00:00','04:00','08:00','12:00','16:00','20:00','23:59']};
  }
  const days=state.period==='week'?7:30,map=new Map();
  rows.forEach(row=>map.set(row.entry_date,(map.get(row.entry_date)||0)+delta(row)));
  const pts=[];let running=0;
  for(let i=0;i<days;i++){
    const d=new Date(r.start);d.setDate(r.start.getDate()+i);const k=localDate(d);running+=map.get(k)||0;pts.push({x:days===1?0:i/(days-1),y:running,date:d});
  }
  const labelIdx=state.period==='week'?[0,1,2,3,4,5,6]:[0,5,10,15,20,25,29];
  const labels=labelIdx.map(i=>{const d=new Date(r.start);d.setDate(r.start.getDate()+i);return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`});
  return {pts,profit,investment,roi:investment?profit/investment*100:0,labels};
}

function niceStep(maxAbs){
  if(maxAbs<=10)return 5;if(maxAbs<=50)return 25;if(maxAbs<=100)return 50;if(maxAbs<=500)return 250;if(maxAbs<=1000)return 500;if(maxAbs<=5000)return 2000;if(maxAbs<=10000)return 5000;return Math.ceil(maxAbs/4/5000)*5000;
}
function axisFormat(v){return Math.abs(v)>=1000?`${(v/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})}k`:Math.round(v).toLocaleString('pt-BR')}

function draw(series){
  const canvas=$('ricoProfitCanvas'),wrap=canvas?.parentElement;if(!canvas||!wrap)return;
  const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  const rect=wrap.getBoundingClientRect(),w=Math.max(320,rect.width),h=Math.max(220,rect.height);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
  const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const pad={l:w<600?46:60,r:16,t:12,b:38},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
  const ys=series.pts.map(p=>p.y);const maxAbs=Math.max(1,...ys.map(v=>Math.abs(v)));const step=niceStep(maxAbs*1.1);const yMax=Math.max(step*2,Math.ceil(maxAbs/step)*step);const yMin=-yMax;
  const X=x=>pad.l+x*cw,Y=y=>pad.t+(yMax-y)/(yMax-yMin)*ch;
  c.font=`${w<600?10:11}px system-ui,-apple-system,Segoe UI,sans-serif`;c.textBaseline='middle';c.fillStyle='#8b9199';c.strokeStyle='rgba(255,255,255,.09)';c.lineWidth=1;
  const ticks=4;
  for(let i=0;i<=ticks;i++){
    const val=yMax-(yMax-yMin)*(i/ticks),yy=Y(val);c.beginPath();c.moveTo(pad.l,yy);c.lineTo(w-pad.r,yy);c.stroke();c.textAlign='right';c.fillText(axisFormat(val),pad.l-9,yy);
  }
  const labels=series.labels;labels.forEach((lab,i)=>{const x=X(i/(labels.length-1));c.beginPath();c.moveTo(x,pad.t);c.lineTo(x,h-pad.b);c.strokeStyle='rgba(255,255,255,.055)';c.stroke();c.fillStyle='#8b9199';c.textAlign=i===0?'left':i===labels.length-1?'right':'center';c.textBaseline='top';c.fillText(lab,x,h-pad.b+10)});
  const zero=Y(0);c.save();c.setLineDash([6,6]);c.strokeStyle='rgba(255,255,255,.30)';c.beginPath();c.moveTo(pad.l,zero);c.lineTo(w-pad.r,zero);c.stroke();c.restore();
  if(!series.pts.length)return;
  const grad=c.createLinearGradient(0,pad.t,0,h-pad.b);grad.addColorStop(0,'rgba(255,255,255,.38)');grad.addColorStop(.65,'rgba(255,255,255,.08)');grad.addColorStop(1,'rgba(255,255,255,.015)');
  c.beginPath();series.pts.forEach((p,i)=>{const x=X(p.x),y=Y(p.y);i?c.lineTo(x,y):c.moveTo(x,y)});const last=series.pts.at(-1),first=series.pts[0];c.lineTo(X(last.x),zero);c.lineTo(X(first.x),zero);c.closePath();c.fillStyle=grad;c.fill();
  c.save();c.shadowColor='rgba(255,255,255,.45)';c.shadowBlur=10;c.beginPath();series.pts.forEach((p,i)=>{const x=X(p.x),y=Y(p.y);i?c.lineTo(x,y):c.moveTo(x,y)});c.strokeStyle='#f5f5f5';c.lineWidth=2;c.lineJoin='round';c.lineCap='round';c.stroke();c.restore();
  const maxDots=w<620?18:34,skip=Math.max(1,Math.ceil(series.pts.length/maxDots));c.fillStyle='#fff';for(let i=0;i<series.pts.length;i+=skip){const p=series.pts[i];c.beginPath();c.arc(X(p.x),Y(p.y),2.6,0,Math.PI*2);c.fill()}if(last){c.beginPath();c.arc(X(last.x),Y(last.y),3.7,0,Math.PI*2);c.fill()}
}

function render(rows){
  const series=buildSeries(rows),isToday=state.period==='today';
  const label=isToday?'Lucro do Dia':state.period==='week'?'Lucro em 7 Dias':'Lucro em 30 Dias';
  $('ricoChartKicker').textContent=label;$('ricoChartMetricLabel').textContent=label;$('ricoChartBig').textContent=signed(series.profit);$('ricoChartProfit').textContent=money(series.profit);$('ricoChartInvestment').textContent=money(series.investment);$('ricoChartRoi').textContent=`${series.roi.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}%`;
  $('ricoChartEmpty').style.display=rows.length?'none':'flex';draw(series);state.series=series;
}

async function refresh(force=false){
  if(state.loading)return;const card=mount();if(!card)return;
  syncCycleDock();
  if(!currentUser()||!db()){setTimeout(()=>refresh(true),600);return}
  state.loading=true;
  try{const rows=await loadRows();const sig=JSON.stringify(rows.map(x=>[x.id,x.value,x.entry_type,x.entry_date,x.created_at]));if(force||sig!==state.sig){state.sig=sig;state.rows=rows;render(rows)}}finally{state.loading=false}
}

function bindRefreshTriggers(){
  document.addEventListener('click',e=>{if(e.target?.closest?.('#addDep,#addMaeDep,#addSaq,#addBau,[data-del],#finishCycleBtn'))setTimeout(()=>refresh(true),900)});
  window.addEventListener('resize',()=>{clearTimeout(state.resize);state.resize=setTimeout(()=>state.series&&draw(state.series),120)});
}

function boot(){injectStyles();mount();bindRefreshTriggers();refresh(true);state.timer=setInterval(()=>refresh(false),12000);state.cycleTimer=setInterval(syncCycleDock,700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('Equipe Rico profit chart',BUILD);
})();