(()=>{
  const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n||0));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const getUser=()=>{try{return typeof user!=='undefined'&&user&&user.id?user:null}catch(_){return null}};
  const getClients=()=>{try{return Array.isArray(clients)?clients:[]}catch(_){return []}};
  const getEntries=()=>{try{return Array.isArray(entries)?entries:[]}catch(_){return []}};

  function totalsForClient(id){
    let deposit=0,withdraw=0,chest=0;
    for(const e of getEntries()){
      if(e.client_id!==id)continue;
      const v=Number(e.value||0);
      if(e.entry_type==='deposito'||e.entry_type==='deposito_mae')deposit+=v;
      else if(e.entry_type==='saque')withdraw+=v;
      else if(e.entry_type==='bau')chest+=v;
    }
    return {deposit,withdraw,chest,profit:withdraw+chest-deposit};
  }

  function cycleName(){return document.getElementById('ricoActiveCycleName')?.textContent?.trim()||'Ciclo'}

  function dashboardGrid(){
    return document.querySelector('.dashboard-view.layout')||document.querySelector('.dashboard-view');
  }

  function placeOutsideDashboard(root){
    const grid=dashboardGrid();
    if(!grid||!grid.parentNode||!root)return;
    const bar=document.getElementById('ricoCycleTabsBar');
    if(bar){
      if(bar.previousElementSibling!==grid)grid.insertAdjacentElement('afterend',bar);
      if(root.previousElementSibling!==bar)bar.insertAdjacentElement('afterend',root);
    }else if(root.previousElementSibling!==grid){
      grid.insertAdjacentElement('afterend',root);
    }
  }

  function mount(){
    let root=document.getElementById('ricoOpsV2');
    if(root){placeOutsideDashboard(root);return root}
    const anchor=document.querySelector('.history-sections')||document.querySelector('.cycle-board');
    if(!anchor)return null;
    root=document.createElement('section');
    root.id='ricoOpsV2';
    root.innerHTML=`
      <div class="rico-ops-head">
        <div class="rico-ops-title-wrap">
          <div class="rico-ops-logo">▦</div>
          <div><h2 class="rico-ops-title" id="ricoOpsTitle">Operações do Ciclo</h2><p class="rico-ops-sub">Depósitos, saques e baús organizados por tela e por ciclo.</p></div>
        </div>
        <div class="rico-ops-head-right">
          <div class="rico-cycle-profit-card" id="ricoCycleProfitCard"><div class="rico-cycle-profit-icon">↗</div><div><span>Lucro do ciclo</span><strong id="ricoCycleProfit">R$ 0,00</strong></div></div>
          <button class="rico-new-screen" id="ricoNewScreen" type="button">＋ Nova tela</button>
        </div>
      </div>
      <div class="rico-ops-table-wrap">
        <table class="rico-ops-table">
          <thead><tr><th>🖥 Tela</th><th>▣ Depósito</th><th>⇩ Saque</th><th>▰ Baú</th><th>⟳ Ciclo</th><th>▥ Lucro</th><th>⚙ Ações</th></tr></thead>
          <tbody id="ricoOpsRows"></tbody>
        </table>
      </div>
      <div class="rico-ops-foot"><span id="ricoOpsCount">0 telas neste ciclo</span><span id="ricoOpsTotals"></span></div>`;
    anchor.parentNode.insertBefore(root,anchor);
    document.body.classList.add('rico-ops-v2-ready');
    root.querySelector('#ricoNewScreen').addEventListener('click',()=>{
      const input=document.getElementById('clientName');
      if(input){input.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>input.focus(),350)}
    });
    placeOutsideDashboard(root);
    return root;
  }

  function placeCycleBar(){
    const bar=document.getElementById('ricoCycleTabsBar'),root=document.getElementById('ricoOpsV2');
    if(!root)return;
    if(bar)bar.classList.add('rico-cycle-bar-v2');
    placeOutsideDashboard(root);
  }

  function renderRows(){
    const root=mount();if(!root||!getUser())return;
    placeCycleBar();
    const rows=document.getElementById('ricoOpsRows');if(!rows)return;
    const list=getClients().slice().sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')));
    const cName=cycleName();
    let dep=0,saq=0,bau=0,profit=0;
    if(!list.length){
      rows.innerHTML='<tr><td colspan="7" class="rico-ops-empty"><strong>Nenhuma tela neste ciclo.</strong>Crie uma nova tela e ela ficará somente nesta aba.</td></tr>';
    }else{
      rows.innerHTML=list.map(c=>{
        const t=totalsForClient(c.id);dep+=t.deposit;saq+=t.withdraw;bau+=t.chest;profit+=t.profit;
        const created=c.created_at?new Date(c.created_at).toLocaleDateString('pt-BR'):'';
        const meta=c.house_link?`<a class="rico-screen-link" href="${esc(c.house_link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗ abrir casa</a>`:(created?`Criada em ${created}`:'Tela operacional');
        const depCls=t.deposit?'deposit':'zero',saqCls=t.withdraw?'withdraw':'zero',bauCls=t.chest?'chest':'zero';
        const pCls=t.profit<0?'negative':(t.profit===0?'neutral':'');
        return `<tr data-client-id="${esc(c.id)}">
          <td class="rico-screen-cell"><span class="rico-screen-name">${esc(c.name)}</span><span class="rico-screen-meta">${meta}</span></td>
          <td><div class="rico-money-box ${depCls}">${money(t.deposit)}</div></td>
          <td><div class="rico-money-box ${saqCls}">${money(t.withdraw)}</div></td>
          <td><div class="rico-money-box ${bauCls}">${money(t.chest)}</div></td>
          <td><span class="rico-cycle-badge"><i></i>${esc(cName)}</span></td>
          <td><span class="rico-profit ${pCls}">${t.profit>0?'+':''}${money(t.profit)}</span></td>
          <td><div class="rico-actions"><button class="rico-action-btn rico-action-open" type="button" data-open="${esc(c.id)}" title="Abrir tela">↗</button><button class="rico-action-btn rico-action-delete" type="button" data-delete="${esc(c.id)}" title="Excluir tela">🗑</button></div></td>
        </tr>`;
      }).join('');
    }
    document.getElementById('ricoOpsTitle').textContent=`Operações do ${cName}`;
    const pc=document.getElementById('ricoCycleProfitCard'),pv=document.getElementById('ricoCycleProfit');
    if(pv)pv.textContent=(profit>0?'+':'')+money(profit);
    if(pc)pc.classList.toggle('negative',profit<0);
    const count=document.getElementById('ricoOpsCount'),totals=document.getElementById('ricoOpsTotals');
    if(count)count.textContent=`${list.length} ${list.length===1?'tela':'telas'} neste ciclo`;
    if(totals)totals.innerHTML=`Depósitos <strong>${money(dep)}</strong> · Saques <strong>${money(saq)}</strong> · Baús <strong>${money(bau)}</strong>`;
    rows.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openClient(b.dataset.open)));
    rows.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{
      const id=b.dataset.delete;
      if(typeof window.deleteCycleClient==='function')await window.deleteCycleClient(id);
      else if(typeof sb!=='undefined'){
        if(!confirm('Excluir esta tela e todo o histórico?'))return;
        const {error}=await sb.from('cpa_clients').delete().eq('id',id);
        if(error)return alert(error.message);
        if(typeof loadData==='function')await loadData();
      }
    }));
    placeOutsideDashboard(root);
  }

  function openClient(id){
    try{selectedClientId=id}catch(_){}
    const sel=document.getElementById('clientSelect');if(sel)sel.value=id;
    try{if(typeof render==='function')render()}catch(_){}
    const target=document.getElementById('detailName')||document.getElementById('clientSelect');
    if(target)target.scrollIntoView({behavior:'smooth',block:'center'});
  }

  function bindObservers(){
    const bar=document.getElementById('ricoCycleTabsBar');
    if(bar&&!bar.dataset.opsV2Observed){
      bar.dataset.opsV2Observed='1';
      new MutationObserver(()=>setTimeout(renderRows,20)).observe(bar,{subtree:true,childList:true,characterData:true,attributes:true});
      bar.addEventListener('click',()=>setTimeout(renderRows,250),true);
    }
  }

  function boot(){
    if(!getUser())return;
    mount();placeCycleBar();bindObservers();renderRows();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,300));else setTimeout(boot,300);
  setTimeout(boot,800);
  setInterval(()=>{if(getUser()){boot()}},1200);
})();
