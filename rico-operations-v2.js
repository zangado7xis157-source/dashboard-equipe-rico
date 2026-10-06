(()=>{
  const state={cycles:[],activeId:null,userId:null,refreshing:false,initialized:false};
  const storageKey=uid=>`rico_active_cycle_v2_${uid}`;
  const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n||0));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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

  function cycleScreens(id){return getClients().filter(c=>c.cycle_id===id)}
  function activeCycle(){return state.cycles.find(c=>c.id===state.activeId)||state.cycles[0]||null}

  function mount(){
    let root=document.getElementById('ricoOpsV2');
    if(root)return root;
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
      <div class="rico-ops-tabs-wrap"><div class="rico-ops-tabs" id="ricoOpsTabs"></div></div>
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
    return root;
  }

  function renderTabs(){
    const box=document.getElementById('ricoOpsTabs');if(!box)return;
    box.innerHTML='';
    state.cycles.forEach((c,i)=>{
      const count=cycleScreens(c.id).length;
      const b=document.createElement('button');
      b.type='button';b.className='rico-cycle-tab'+(c.id===state.activeId?' active':'');
      b.innerHTML=`<span class="rico-cycle-tab-name"><i class="rico-cycle-dot"></i>${esc(c.name||`Ciclo ${i+1}`)}</span><span class="rico-cycle-tab-meta">${count} ${count===1?'tela':'telas'}</span>`;
      b.addEventListener('click',()=>switchCycle(c.id));box.appendChild(b);
    });
    const add=document.createElement('button');add.type='button';add.className='rico-new-cycle';add.textContent='＋ Novo ciclo';add.addEventListener('click',createCycle);box.appendChild(add);
  }

  function renderRows(){
    const root=mount();if(!root||!state.activeId)return;
    const cycle=activeCycle();
    const rows=document.getElementById('ricoOpsRows');if(!rows)return;
    const list=cycleScreens(state.activeId).slice().sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')));
    let dep=0,saq=0,bau=0,profit=0;
    if(!list.length){
      rows.innerHTML='<tr><td colspan="7" class="rico-ops-empty"><strong>Nenhuma tela neste ciclo.</strong>Crie uma nova tela e ela ficará somente nesta aba.</td></tr>';
    }else{
      rows.innerHTML=list.map(c=>{
        const t=totalsForClient(c.id);dep+=t.deposit;saq+=t.withdraw;bau+=t.chest;profit+=t.profit;
        const created=c.created_at?new Date(c.created_at).toLocaleDateString('pt-BR'):'';
        const link=c.house_link?`<a class="rico-screen-link" href="${esc(c.house_link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗ abrir casa</a>`:(created?`Criada em ${created}`:'Tela operacional');
        const depCls=t.deposit?'deposit':'zero',saqCls=t.withdraw?'withdraw':'zero',bauCls=t.chest?'chest':'zero';
        const pCls=t.profit<0?'negative':(t.profit===0?'neutral':'');
        return `<tr data-client-id="${esc(c.id)}">
          <td class="rico-screen-cell"><span class="rico-screen-name">${esc(c.name)}</span><span class="rico-screen-meta">${link}</span></td>
          <td><div class="rico-money-box ${depCls}">${money(t.deposit)}</div></td>
          <td><div class="rico-money-box ${saqCls}">${money(t.withdraw)}</div></td>
          <td><div class="rico-money-box ${bauCls}">${money(t.chest)}</div></td>
          <td><span class="rico-cycle-badge"><i></i>${esc(cycle?.name||'Ciclo')}</span></td>
          <td><span class="rico-profit ${pCls}">${t.profit>0?'+':''}${money(t.profit)}</span></td>
          <td><div class="rico-actions"><button class="rico-action-btn rico-action-open" type="button" data-open="${esc(c.id)}" title="Abrir tela">↗</button><button class="rico-action-btn rico-action-delete" type="button" data-delete="${esc(c.id)}" title="Excluir tela">🗑</button></div></td>
        </tr>`;
      }).join('');
    }
    document.getElementById('ricoOpsTitle').textContent=`Operações do ${cycle?.name||'Ciclo'}`;
    const pc=document.getElementById('ricoCycleProfitCard'),pv=document.getElementById('ricoCycleProfit');
    pv.textContent=(profit>0?'+':'')+money(profit);pc.classList.toggle('negative',profit<0);
    document.getElementById('ricoOpsCount').textContent=`${list.length} ${list.length===1?'tela':'telas'} neste ciclo`;
    document.getElementById('ricoOpsTotals').innerHTML=`Depósitos <strong>${money(dep)}</strong> · Saques <strong>${money(saq)}</strong> · Baús <strong>${money(bau)}</strong>`;
    rows.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openClient(b.dataset.open)));
    rows.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{const id=b.dataset.delete;if(typeof window.deleteCycleClient==='function')await window.deleteCycleClient(id);else if(typeof sb!=='undefined'){if(!confirm('Excluir esta tela e todo o histórico?'))return;await sb.from('cpa_clients').delete().eq('id',id);if(typeof loadData==='function')await loadData()}}));
  }

  function renderAll(){mount();renderTabs();renderRows()}

  function openClient(id){
    try{selectedClientId=id}catch(_){}
    const sel=document.getElementById('clientSelect');if(sel)sel.value=id;
    try{if(typeof render==='function')render()}catch(_){}
    const target=document.getElementById('detailName')||document.getElementById('clientSelect');if(target)target.scrollIntoView({behavior:'smooth',block:'center'});
  }

  function switchCycle(id){
    if(!state.cycles.some(c=>c.id===id))return;
    state.activeId=id;const u=getUser();if(u)localStorage.setItem(storageKey(u.id),id);
    const list=cycleScreens(id);try{selectedClientId=list[0]?.id||null}catch(_){}
    const sel=document.getElementById('clientSelect');if(sel&&list[0])sel.value=list[0].id;
    try{if(typeof render==='function')render()}catch(_){}
    renderAll();
  }

  async function createCycle(){
    const u=getUser();if(!u||typeof sb==='undefined')return;
    const n=state.cycles.length+1;
    const {data,error}=await sb.from('cpa_cycles').insert({user_id:u.id,name:`Ciclo ${n}`,status:'active'}).select().single();
    if(error){alert('Não foi possível criar o ciclo: '+error.message);return}
    state.cycles.push(data);state.activeId=data.id;localStorage.setItem(storageKey(u.id),data.id);try{selectedClientId=null}catch(_){};renderAll();
  }

  async function ensureCycles(force=false){
    const u=getUser();if(!u||typeof sb==='undefined')return false;
    if(state.refreshing)return false;
    if(!force&&state.userId===u.id&&state.cycles.length)return true;
    state.refreshing=true;
    try{
      let {data,error}=await sb.from('cpa_cycles').select('*').eq('user_id',u.id).order('created_at',{ascending:true});
      if(error)throw error;
      if(!data?.length){
        const ins=await sb.from('cpa_cycles').insert({user_id:u.id,name:'Ciclo 1',status:'active'}).select().single();
        if(ins.error)throw ins.error;data=[ins.data];
      }
      state.userId=u.id;state.cycles=data||[];
      const saved=localStorage.getItem(storageKey(u.id));
      state.activeId=state.cycles.some(c=>c.id===saved)?saved:(state.cycles.find(c=>c.status==='active')?.id||state.cycles[0]?.id||null);
      if(state.activeId)localStorage.setItem(storageKey(u.id),state.activeId);
      const nullClients=getClients().filter(c=>!c.cycle_id);
      if(nullClients.length&&state.cycles[0]){
        const upd=await sb.from('cpa_clients').update({cycle_id:state.cycles[0].id}).eq('user_id',u.id).is('cycle_id',null);
        if(!upd.error&&typeof loadData==='function')await loadData();
      }
      renderAll();return true;
    }catch(err){console.warn('rico cycles',err);return false}
    finally{state.refreshing=false}
  }

  function captureAddClient(){
    const btn=document.getElementById('addClient');if(!btn||btn.dataset.ricoCycleV2==='1')return;
    btn.dataset.ricoCycleV2='1';
    btn.addEventListener('click',async ev=>{
      const u=getUser();if(!u||typeof sb==='undefined')return;
      if(!state.activeId)await ensureCycles(true);
      if(!state.activeId)return;
      ev.preventDefault();ev.stopImmediatePropagation();
      const name=document.getElementById('clientName')?.value.trim();if(!name)return alert('Digite o nome do cliente.');
      const payload={user_id:u.id,name,house_link:document.getElementById('houseLink')?.value.trim()||null,note:document.getElementById('clientObs')?.value.trim()||null,cycle_id:state.activeId};
      const {data,error}=await sb.from('cpa_clients').insert(payload).select().single();
      if(error)return alert(error.message);
      ['clientName','houseLink','clientObs'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
      try{selectedClientId=data.id}catch(_){}
      if(typeof loadData==='function')await loadData();else renderAll();
    },true);
  }

  function wrapCore(){
    try{
      if(typeof render==='function'&&!render.__ricoOpsV2){const core=render;const wrapped=function(){const r=core.apply(this,arguments);queueMicrotask(renderAll);return r};wrapped.__ricoOpsV2=true;render=wrapped}
    }catch(_){}
    try{
      if(typeof loadData==='function'&&!loadData.__ricoOpsV2){const core=loadData;const wrapped=async function(){const r=await core.apply(this,arguments);renderAll();return r};wrapped.__ricoOpsV2=true;loadData=wrapped}
    }catch(_){}
  }

  async function boot(){
    mount();wrapCore();captureAddClient();
    const u=getUser();
    if(u){if(state.userId!==u.id)await ensureCycles(true);else renderAll()}
    else{state.userId=null;state.cycles=[];state.activeId=null}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,80));else setTimeout(boot,80);
  setTimeout(boot,450);
  setInterval(()=>{wrapCore();captureAddClient();const u=getUser();if(u&&state.userId!==u.id)ensureCycles(true);else if(u)renderAll()},1800);
})();
