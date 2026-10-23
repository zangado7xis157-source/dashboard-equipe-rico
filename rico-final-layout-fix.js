(()=>{
'use strict';
const BUILD='2026.10.23.3';

function injectFinalTheme(){
  if(document.getElementById('ricoFinalMonoFix')) return;
  const s=document.createElement('style');
  s.id='ricoFinalMonoFix';
  s.textContent=`
/* Equipe Rico — correção final de posição + monocromático */
body #appScreen{background:#050607!important;color:#f4f4f5!important}
body #appScreen *:not(img):not(canvas){background-image:none!important;box-shadow:none!important;text-shadow:none!important}
body #appScreen *{border-color:#30343a!important}
body #appScreen h1,body #appScreen h1 *,body #appScreen h2,body #appScreen h2 *,body #appScreen h3,body #appScreen h3 *,body #appScreen strong,body #appScreen .value,body #appScreen .profit,body #appScreen .rico-profit,body #appScreen .er-rank-profit,body #appScreen .er-rank-name{color:#fff!important}
body #appScreen p,body #appScreen small,body #appScreen .muted,body #appScreen .label,body #appScreen .range,body #appScreen .period,body #appScreen .side-menu-sub,body #appScreen .rico-ops-sub,body #appScreen .rico-screen-meta,body #appScreen .rico-ops-foot{color:#969ba3!important}
body #appScreen a,body #appScreen .main-menu-bar,body #appScreen .main-menu-bar *,body #appScreen .main-menu-toggle,body #appScreen .main-menu-toggle *,body #appScreen .side-menu-title,body #appScreen .side-menu-brand,body #appScreen .side-menu-brand *,body #appScreen .er-greeting-copy h1 span{color:#f4f4f5!important}
body #appScreen button:not(.primary):not(.rico-new-screen):not(.er-period-btn.active):not(.monthly-payment-btn):not(.network-join-btn),body #appScreen select,body #appScreen input,body #appScreen textarea{background:#0b0d10!important;color:#f4f4f5!important;border-color:#343840!important}
body #appScreen .primary,body #appScreen .rico-new-screen,body #appScreen .er-period-btn.active,body #appScreen .monthly-payment-btn,body #appScreen .network-join-btn,body #appScreen #finishCycleBtn{background:#f4f4f5!important;color:#08090a!important;border-color:#f4f4f5!important}
body #appScreen .card,body #appScreen .mini,body #appScreen .box,body #appScreen aside,body #appScreen main.card,body #appScreen [class*='card'],body #appScreen [class*='panel'],body #appScreen [class*='banner'],body #appScreen [class*='section'],body #appScreen #ricoOpsV2,body #appScreen #ricoProfitChartCard{background:#0b0d10!important;border-color:#30343a!important}
body #appScreen [class*='warning'],body #appScreen [class*='reminder'],body #appScreen [class*='alert'],body #appScreen [class*='notice']{background:#0b0d10!important;color:#f4f4f5!important;border-color:#343840!important}
body #appScreen .rico-money-box,body #appScreen .rico-cycle-badge,body #appScreen .rico-cycle-profit-card,body #appScreen .trialbadge,body #appScreen .admin-status,body #appScreen .game-provider-badge{background:#111318!important;color:#f4f4f5!important;border-color:#353941!important}
body #appScreen .rico-money-box.deposit,body #appScreen .rico-money-box.withdraw,body #appScreen .rico-money-box.chest,body #appScreen .rico-profit,body #appScreen .rico-profit.negative,body #appScreen .profit-positive,body #appScreen .profit-negative{color:#f4f4f5!important}
body #appScreen svg *,body #appScreen svg path,body #appScreen svg circle,body #appScreen svg rect{stroke:#f4f4f5!important}
body #appScreen .side-menu-icon,body #appScreen .main-menu-toggle{filter:grayscale(1)!important}
body #appScreen #ricoCycleTabsBar{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}
body #appScreen #ricoProfitChartCard{display:block!important;width:100%!important;box-sizing:border-box!important;margin:14px 0!important;padding:22px!important;border:1px solid #30343a!important;border-radius:20px!important;background:#090b0e!important}
body #appScreen .rico-chart-select{background:#0b0d10!important;color:#fff!important;border-color:#343840!important}
body #appScreen .rico-chart-metric{background:#080a0d!important;border-color:#2d3137!important}
body #appScreen .rico-chart-dot{background:#f4f4f5!important;box-shadow:none!important}
body #appScreen .rico-cycle-compact{background:#0b0d10!important;border-color:#343840!important}
@media(max-width:720px){body #appScreen #ricoProfitChartCard{padding:16px!important;border-radius:16px!important}}
`;
  document.head.appendChild(s);
}

function fixLayout(){
  injectFinalTheme();
  const bar=document.getElementById('ricoCycleTabsBar');
  if(bar){
    bar.style.setProperty('display','none','important');
    bar.style.setProperty('height','0','important');
    bar.style.setProperty('margin','0','important');
    bar.style.setProperty('padding','0','important');
    bar.style.setProperty('border','0','important');
  }
  const chart=document.getElementById('ricoProfitChartCard');
  const layout=document.querySelector('.grid.layout.dashboard-view');
  if(chart&&layout&&chart.nextElementSibling!==layout){
    layout.parentNode.insertBefore(chart,layout);
  }

  const app=document.getElementById('appScreen');
  if(app){
    app.querySelectorAll('*:not(img):not(canvas)').forEach(el=>{
      const cs=getComputedStyle(el);
      const color=cs.color;
      const bg=cs.backgroundColor;
      const chromatic=(value)=>{
        const m=String(value||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);if(!m)return false;
        const [r,g,b]=m.slice(1).map(Number);return Math.max(r,g,b)-Math.min(r,g,b)>18;
      };
      if(chromatic(color) && !el.closest('img')) el.style.setProperty('color','#f4f4f5','important');
      if(chromatic(bg) && !el.matches('button.primary,.rico-new-screen,.er-period-btn.active,.monthly-payment-btn,.network-join-btn,#finishCycleBtn')) el.style.setProperty('background-color','#0b0d10','important');
    });
  }
}

function boot(){
  fixLayout();
  const observer=new MutationObserver(()=>fixLayout());
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  setInterval(fixLayout,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('Equipe Rico final layout fix',BUILD);
})();