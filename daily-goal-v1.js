(() => {
  'use strict';
  const $id = (id) => document.getElementById(id);
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const money = (v) => {
    try { return typeof fmt === 'function' ? fmt(Number(v)||0) : (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
    catch { return `R$ ${(Number(v)||0).toFixed(2).replace('.',',')}`; }
  };

  let goalRow = null;
  let loadedFor = null;
  let busy = false;
  let lastProfit = null;
  let mounted = false;

  function injectStyles(){
    if ($id('ricoDailyGoalStyle')) return;
    const s = document.createElement('style');
    s.id = 'ricoDailyGoalStyle';
    s.textContent = `
      .rico-daily-goal{margin:0 0 16px;padding:16px 17px;border-radius:16px;border:1px solid rgba(255,255,255,.16);background:linear-gradient(135deg,#111,#191919);box-shadow:0 14px 34px rgba(0,0,0,.22);color:#fff;transition:border-color .25s ease,background .25s ease;overflow-anchor:none!important}
      .rico-daily-goal.done{border-color:rgba(49,230,124,.7);background:linear-gradient(135deg,rgba(12,55,31,.98),rgba(8,35,20,.98));box-shadow:0 14px 38px rgba(49,230,124,.12),inset 0 0 34px rgba(49,230,124,.06)}
      .rico-daily-goal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .rico-daily-goal-title{font-size:12px;font-weight:950;letter-spacing:.13em;color:#f5f5f5}.rico-daily-goal.done .rico-daily-goal-title{color:#75f0a8}
      .rico-daily-goal-values{font-size:22px;font-weight:950;margin-top:4px}.rico-daily-goal-values span{font-size:12px;color:#a9a9a9;font-weight:800}
      .rico-daily-goal-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .rico-daily-goal-input{width:140px;max-width:46vw;background:#090909;color:#fff;border:1px solid #3b3b3b;border-radius:10px;padding:10px 11px;font-weight:900;outline:none}
      .rico-daily-goal-input:focus{border-color:#777}.rico-daily-goal-save{border:1px solid #555;background:#fff;color:#080808;border-radius:10px;padding:10px 13px;font-weight:950;cursor:pointer}
      .rico-daily-goal-track{height:12px;border-radius:999px;background:#292929;overflow:hidden;margin-top:13px;border:1px solid rgba(255,255,255,.08)}
      .rico-daily-goal-fill{height:100%;width:0;background:linear-gradient(90deg,#9a9a9a,#f3f3f3);border-radius:999px;transition:width .35s ease,background .25s ease}
      .rico-daily-goal.done .rico-daily-goal-fill{background:linear-gradient(90deg,#18b95c,#38ef88)}
      .rico-daily-goal-foot{display:flex;justify-content:space-between;gap:10px;margin-top:8px;font-size:11px;color:#a8a8a8;font-weight:800;flex-wrap:wrap}.rico-daily-goal.done .rico-daily-goal-status{color:#65ef9c}
      #testNotificationsBtn{white-space:nowrap}
      @media(max-width:620px){.rico-daily-goal{padding:14px}.rico-daily-goal-values{font-size:19px}.rico-daily-goal-actions{width:100%}.rico-daily-goal-input{flex:1;width:auto;max-width:none}.rico-daily-goal-save{flex:0 0 auto}}
    `;
    document.head.appendChild(s);
  }

  function mountWidgetOnce(){
    let box = $id('ricoDailyGoal');
    if (box) { mounted = true; return true; }

    const chart = $id('ricoProfitChartCard');
    const metrics = document.querySelector('.grid.metrics.dashboard-view');
    const fallback = document.querySelector('.cycle-board') || document.querySelector('.cycle-save-reminder');
    if (!chart?.parentNode && !metrics?.parentNode && !fallback?.parentNode) return false;

    box = document.createElement('section');
    box.id = 'ricoDailyGoal';
    box.className = 'rico-daily-goal dashboard-view';
    box.innerHTML = `
      <div class="rico-daily-goal-head">
        <div>
          <div class="rico-daily-goal-title">🎯 META DO DIA</div>
          <div class="rico-daily-goal-values"><b id="ricoGoalCurrent">R$ 0,00</b> <span>/ <b id="ricoGoalTarget">sem meta</b></span></div>
        </div>
        <div class="rico-daily-goal-actions">
          <input id="ricoGoalInput" class="rico-daily-goal-input" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Ex.: 500,00">
          <button id="ricoGoalSave" class="rico-daily-goal-save" type="button">Definir meta</button>
        </div>
      </div>
      <div class="rico-daily-goal-track"><div id="ricoGoalFill" class="rico-daily-goal-fill"></div></div>
      <div class="rico-daily-goal-foot"><span id="ricoGoalStatus">Escolha quanto deseja atingir hoje.</span><span id="ricoGoalPct">0%</span></div>`;

    if (chart?.parentNode) chart.parentNode.insertBefore(box, chart);
    else if (metrics?.parentNode) metrics.insertAdjacentElement('afterend', box);
    else fallback.parentNode.insertBefore(box, fallback);

    $id('ricoGoalSave')?.addEventListener('click', saveGoal);
    mounted = true;
    renderGoal();
    return true;
  }

  function injectTestButton(){
    if ($id('testNotificationsBtn')) return true;
    const enable = $id('enableNotificationsBtn');
    if (!enable?.parentNode) return false;
    const btn = document.createElement('button');
    btn.id = 'testNotificationsBtn';
    btn.className = 'secondary';
    btn.type = 'button';
    btn.textContent = 'Testar notificação';
    btn.addEventListener('click', async () => {
      if (typeof sendRicoPush !== 'function') return alert('O sistema de notificações ainda não foi carregado. Atualize a página e tente novamente.');
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = 'Enviando...';
      try {
        const result = await sendRicoPush('🔔 Teste Equipe Rico','✅ Notificação funcionando corretamente. O push em tempo real está ativo.');
        if (result?.ok) alert(`Teste enviado com sucesso para ${result.sent || 1} aparelho(s). Confira o celular.`);
        else if (result?.reason === 'no_subscription') alert('Nenhum celular está cadastrado para notificações nesta conta. Abra o app no celular, toque em Ativar notificações e tente novamente.');
        else alert('O teste foi enviado, mas não houve confirmação de entrega. Confira se as notificações estão permitidas no celular.');
      } catch(e){ alert('Falha ao enviar a notificação de teste: '+(e?.message||e)); }
      finally { btn.disabled = false; btn.textContent = original; }
    });
    enable.insertAdjacentElement('afterend', btn);
    return true;
  }

  function dailyProfit(){
    try {
      const day = todayKey();
      const list = (Array.isArray(entries) ? entries : []).filter(e => String(e.entry_date||'').slice(0,10) === day);
      if (typeof totals === 'function') {
        const t = totals(list); return Number(t.s||0) + Number(t.b||0) - Number(t.d||0);
      }
      let d=0,s=0,b=0;
      for(const e of list){
        const v=Number(e.value||0);
        if(e.entry_type==='deposito'||e.entry_type==='deposito_mae') d+=v;
        else if(e.entry_type==='saque') s+=v;
        else if(e.entry_type==='bau') b+=v;
      }
      return s+b-d;
    } catch { return 0; }
  }

  async function loadGoal(){
    if (!user?.id || !window.sb || busy) return;
    const day = todayKey();
    if (loadedFor === day && goalRow) return;
    busy = true;
    try {
      const {data,error} = await sb.from('cpa_daily_goals').select('user_id,goal_date,target,notified_at').eq('user_id',user.id).eq('goal_date',day).maybeSingle();
      if (error) throw error;
      goalRow = data || null;
      loadedFor = day;
      if ($id('ricoGoalInput') && goalRow?.target) $id('ricoGoalInput').value = Number(goalRow.target).toFixed(2);
      renderGoal();
    } catch(e){ console.warn('Meta diária:', e); }
    finally { busy = false; }
  }

  async function saveGoal(){
    if (!user?.id) return alert('Entre na sua conta para definir a meta.');
    const raw = Number(String($id('ricoGoalInput')?.value||'').replace(',','.'));
    if (!Number.isFinite(raw) || raw <= 0) return alert('Digite um valor de meta maior que zero.');
    const day = todayKey();
    const btn = $id('ricoGoalSave'); if(btn) btn.disabled = true;
    try {
      const {data,error} = await sb.from('cpa_daily_goals').upsert({user_id:user.id,goal_date:day,target:raw,notified_at:null,updated_at:new Date().toISOString()},{onConflict:'user_id,goal_date'}).select('user_id,goal_date,target,notified_at').single();
      if (error) throw error;
      goalRow = data; loadedFor = day; renderGoal();
      await maybeNotifyGoal();
    } catch(e){ alert('Não foi possível salvar a meta: '+(e?.message||e)); }
    finally { if(btn) btn.disabled = false; }
  }

  function renderGoal(){
    const box = $id('ricoDailyGoal'); if(!box) return;
    const profit = dailyProfit(); lastProfit = profit;
    const target = Number(goalRow?.target||0);
    if($id('ricoGoalCurrent')) $id('ricoGoalCurrent').textContent = money(profit);
    if($id('ricoGoalTarget')) $id('ricoGoalTarget').textContent = target ? money(target) : 'sem meta';
    const pct = target>0 ? Math.max(0,Math.min(100,(profit/target)*100)) : 0;
    if($id('ricoGoalFill')) $id('ricoGoalFill').style.width = `${pct}%`;
    if($id('ricoGoalPct')) $id('ricoGoalPct').textContent = target ? `${Math.round(pct)}%` : '0%';
    const done = target>0 && profit>=target;
    box.classList.toggle('done',done);
    if($id('ricoGoalStatus')) {
      if(!target) $id('ricoGoalStatus').textContent='Escolha quanto deseja atingir hoje.';
      else if(done) $id('ricoGoalStatus').textContent=`✅ Meta batida! ${money(profit-target)} acima da meta.`;
      else $id('ricoGoalStatus').textContent=`Faltam ${money(Math.max(0,target-profit))} para atingir a meta.`;
    }
  }

  async function maybeNotifyGoal(){
    if (!user?.id || !goalRow?.target || goalRow.notified_at) return;
    const profit = dailyProfit();
    const target = Number(goalRow.target||0);
    if (profit < target) return;
    try {
      const now = new Date().toISOString();
      const {data,error} = await sb.from('cpa_daily_goals').update({notified_at:now,updated_at:now}).eq('user_id',user.id).eq('goal_date',todayKey()).is('notified_at',null).select('notified_at');
      if(error) throw error;
      if(data?.length){
        goalRow.notified_at=now;
        if(typeof sendRicoPush==='function') await sendRicoPush('🎯 Meta do dia atingida',`Parabéns! Você alcançou ${money(profit)} e bateu sua meta de ${money(target)}.`);
      }
    } catch(e){ console.warn('Push da meta falhou:',e); }
  }

  async function refreshValues(){
    if (!mounted) mountWidgetOnce();
    injectTestButton();
    if (user?.id) await loadGoal();
    const p = dailyProfit();
    if (p !== lastProfit) renderGoal();
    await maybeNotifyGoal();
  }

  function boot(){
    injectStyles();
    if (!mountWidgetOnce()) {
      const observer = new MutationObserver(() => {
        if (mountWidgetOnce()) {
          injectTestButton();
          observer.disconnect();
          refreshValues();
        }
      });
      observer.observe(document.body,{childList:true,subtree:true});
      setTimeout(() => { observer.disconnect(); mountWidgetOnce(); refreshValues(); }, 5000);
    } else {
      injectTestButton();
      refreshValues();
    }

    document.addEventListener('visibilitychange',()=>{ if(!document.hidden) refreshValues(); });
    window.addEventListener('focus',refreshValues,{passive:true});

    /* Atualiza somente valores; nunca move elementos do layout. */
    setInterval(() => {
      const p = dailyProfit();
      if (p !== lastProfit) {
        renderGoal();
        maybeNotifyGoal();
      }
    },5000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
