(()=>{
'use strict';
const $=id=>document.getElementById(id);
let attempts=0;
function placeAndResize(){
  const metrics=document.querySelector('.grid.metrics.dashboard-view');
  const chart=$('ricoProfitChartCard');
  const cycle=$('ricoCycleTabsBar');
  if(cycle){cycle.style.setProperty('display','none','important');cycle.setAttribute('aria-hidden','true')}
  if(metrics&&chart&&chart.previousElementSibling!==metrics){metrics.insertAdjacentElement('afterend',chart)}
  if(chart){
    chart.style.width='100%';
    const wrap=chart.querySelector('.rico-chart-wrap');
    const canvas=$('ricoProfitCanvas');
    if(wrap&&canvas){
      canvas.style.width='100%';
      canvas.style.height='100%';
      try{window.dispatchEvent(new Event('resize'))}catch(_){}
    }
  }
  attempts++;
  if(attempts<18)setTimeout(placeAndResize,250);
}
function boot(){placeAndResize();
  if('ResizeObserver' in window){
    const ro=new ResizeObserver(()=>{const chart=$('ricoProfitChartCard');if(chart)try{window.dispatchEvent(new Event('resize'))}catch(_){}});
    const watch=()=>{const chart=$('ricoProfitChartCard');if(chart)ro.observe(chart);else setTimeout(watch,300)};watch();
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();