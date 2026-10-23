(()=>{
'use strict';

const ADDON_VERSION='2026.10.23.1';
const state={profile:null,rankingPeriod:'month',rankingTimer:null,bound:false};
const q=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentUser=()=>{try{return typeof user!=='undefined'&&user?.id?user:null}catch(_){return null}};
const db=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};

function localKey(d=new Date()){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function periodRange(period){
  const now=new Date();
  let start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const end=new Date(start);
  if(period==='week'){
    const dow=start.getDay();
    start.setDate(start.getDate()-(dow===0?6:dow-1));
  }else if(period==='month'){
    start=new Date(now.getFullYear(),now.getMonth(),1);
  }
  return {start:localKey(start),end:localKey(end)};
}
function initial(name){return (String(name||'U').trim()[0]||'U').toUpperCase()}
function avatarMarkup(profile,size='normal'){
  const name=profile?.display_name||'Usuário';
  if(profile?.avatar_data) return `<img class="er-avatar er-avatar-${size}" src="${safe(profile.avatar_data)}" alt="Foto de ${safe(name)}">`;
  return `<span class="er-avatar er-avatar-${size} er-avatar-fallback">${safe(initial(name))}</span>`;
}

function injectStyles(){
  if(q('erProfileRankingStyles'))return;
  const style=document.createElement('style');
  style.id='erProfileRankingStyles';
  style.textContent=`
:root{--green:#f3f4f6!important;--green2:#d5d7db!important;--blue:#e7e8ea!important;--yellow:#dedfe2!important;--purple:#cacdd2!important;--red:#9ea3aa!important;--bg:#050607!important;--panel:#0b0d10!important;--panel2:#101216!important;--line:#2a2e34!important;--muted:#9298a2!important;--text:#f7f7f8!important}
html,body{background:#050607!important;color:#f7f7f8!important}.card,.mini,.box,.side-menu,.monthly-payment-banner,.rico-cycle-hub,#ricoOpsV2{background:linear-gradient(145deg,#0b0d10,#070809)!important;border-color:#2d3137!important;box-shadow:none!important}.primary{background:#f4f4f5!important;color:#08090a!important;border-color:#f4f4f5!important}.secondary,.danger{background:#0b0d10!important;color:#f3f4f6!important;border-color:#343840!important}.secondary:hover,.danger:hover{border-color:#f4f4f5!important}.trialbadge{background:#111318!important;color:#f5f5f5!important;border-color:#353941!important}.profit-positive,.profit-negative{color:#f7f7f8!important}.side-menu-item.active{background:#f4f4f5!important;color:#08090a!important;border-color:#f4f4f5!important}.side-menu-item.active .side-menu-sub{color:#4b5058!important}.side-menu-brand span{color:#fff!important}.rico-cycle-hub,.rico-cycle-state,.rico-cycle-tab,.rico-cycle-tab.on{border-color:#4a4f57!important;background:#0b0d10!important;color:#f3f4f6!important}.rico-cycle-result,.rico-cycle-note,.rico-ops-sub{color:#a4a9b1!important}.rico-cycle-result b,.rico-cycle-result b.neg,.rico-profit,.rico-profit.negative{color:#f7f7f8!important}.rico-cycle-profit-card,.rico-money-box,.rico-screen-link{border-color:#363a41!important;color:#f5f5f5!important;background:#0c0e11!important}
#appScreen>.top{align-items:center;gap:18px;border-bottom:1px solid #202329;padding-bottom:14px}.er-greeting-wrap{display:flex;align-items:center;gap:13px}.er-greeting-copy h1{margin:0!important;font-size:clamp(24px,3vw,38px)!important;letter-spacing:-.03em}.er-greeting-copy .muted{margin-top:4px}.er-avatar{display:inline-flex;align-items:center;justify-content:center;object-fit:cover;border-radius:50%;border:1px solid #3a3e45;background:#15171b;color:#fff;font-weight:900;flex:0 0 auto}.er-avatar-normal{width:48px;height:48px;font-size:17px}.er-avatar-small{width:38px;height:38px;font-size:14px}.er-avatar-large{width:92px;height:92px;font-size:30px}.er-avatar-fallback{box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)}
.er-addon-view{margin-top:14px}.er-view-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.er-view-head h2{margin:0}.er-view-sub{color:#9298a2;margin-top:5px}.er-periods{display:flex;gap:8px;flex-wrap:wrap}.er-period-btn{border:1px solid #343840;background:#0b0d10;color:#dfe1e4;border-radius:10px;padding:9px 13px;font-weight:800;cursor:pointer}.er-period-btn.active{background:#f4f4f5;color:#070809;border-color:#f4f4f5}.er-ranking-card{margin-top:14px;padding:0;overflow:hidden}.er-ranking-row{display:grid;grid-template-columns:64px minmax(180px,1fr) minmax(130px,auto);align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #202329}.er-ranking-row:last-child{border-bottom:0}.er-ranking-row.me{background:#111419}.er-rank-pos{font-size:20px;font-weight:950;color:#f4f4f5}.er-rank-user{display:flex;align-items:center;gap:12px;min-width:0}.er-rank-name{font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.er-rank-you{font-size:10px;color:#969ca5;margin-top:3px;letter-spacing:.08em}.er-rank-profit{text-align:right;font-size:19px;font-weight:950}.er-empty{padding:34px;text-align:center;color:#9298a2}.er-ranking-note{margin-top:10px;font-size:12px;color:#818791}
.er-settings-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.7fr);gap:14px;margin-top:14px}.er-profile-card{padding:20px}.er-profile-preview{display:flex;align-items:center;gap:16px;margin-bottom:20px}.er-profile-preview strong{font-size:20px;display:block}.er-field{display:grid;gap:7px;margin:13px 0}.er-field label{font-size:12px;font-weight:850;color:#a9aeb5}.er-field input[type=text],.er-field input[type=file]{width:100%;box-sizing:border-box;background:#080a0d;color:#f5f5f5;border:1px solid #30343a;border-radius:10px;padding:12px}.er-settings-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}.er-help{padding:20px;line-height:1.65;color:#b2b6bd}.er-help strong{color:#fff}.er-save-msg{min-height:20px;margin-top:10px;color:#b9bdc4;font-size:12px}.er-upload-note{font-size:11px;color:#818791}.hidden.er-addon-view{display:none!important}
@media(max-width:760px){.er-ranking-row{grid-template-columns:48px 1fr;}.er-rank-profit{grid-column:2;text-align:left;margin-top:-4px}.er-settings-grid{grid-template-columns:1fr}.er-avatar-normal{width:42px;height:42px}.er-greeting-copy h1{font-size:24px!important}}
`;
  document.head.appendChild(style);
}

function mountViews(){
  const app=q('appScreen');
  if(!app)return;
  if(!q('rankingView')){
    const section=document.createElement('section');
    section.id='rankingView';section.className='hidden er-addon-view';
    section.innerHTML=`
      <div class="card">
        <div class="er-view-head">
          <div><h2>Ranking de Lucros</h2><div class="er-view-sub">Somente nome, foto e lucro dos usuários do Dashboard EQUIPE RICO.</div></div>
          <div class="er-periods">
            <button class="er-period-btn" data-rank-period="today">Hoje</button>
            <button class="er-period-btn" data-rank-period="week">Semana</button>
            <button class="er-period-btn active" data-rank-period="month">Mês</button>
            <button class="secondary" id="erRankRefresh">Atualizar</button>
          </div>
        </div>
      </div>
      <div class="card er-ranking-card"><div id="erRankingRows" class="er-empty">Carregando ranking...</div></div>
      <div class="er-ranking-note">O ranking não mostra depósitos, saques, baús, e-mail nem outros dados das contas.</div>`;
    app.appendChild(section);
  }
  if(!q('settingsView')){
    const section=document.createElement('section');
    section.id='settingsView';section.className='hidden er-addon-view';
    section.innerHTML=`
      <div class="card"><div class="er-view-head"><div><h2>Configurações</h2><div class="er-view-sub">Personalize como seu perfil aparece no dashboard e no ranking.</div></div></div></div>
      <div class="er-settings-grid">
        <div class="card er-profile-card">
          <div class="er-profile-preview"><div id="erProfileAvatarPreview"></div><div><strong id="erProfilePreviewName">Usuário</strong><span class="muted">Seu perfil público no ranking</span></div></div>
          <div class="er-field"><label for="erDisplayName">Como você quer ser chamado?</label><input id="erDisplayName" type="text" maxlength="30" placeholder="Ex.: Rico" autocomplete="off"></div>
          <div class="er-field"><label for="erAvatarFile">Foto de perfil (opcional)</label><input id="erAvatarFile" type="file" accept="image/jpeg,image/png,image/webp"><div class="er-upload-note">A imagem é reduzida automaticamente para ficar leve no dashboard.</div></div>
          <div class="er-settings-actions"><button class="primary" id="erSaveProfile">Salvar perfil</button><button class="secondary" id="erRemoveAvatar">Remover foto</button></div>
          <div id="erProfileMsg" class="er-save-msg"></div>
        </div>
        <div class="card er-help"><strong>Como vai aparecer</strong><br>O nome escolhido será usado no topo em “Olá, seu nome”. No Ranking aparecem apenas sua foto, seu nome e seu lucro do período selecionado.</div>
      </div>`;
    app.appendChild(section);
  }
}

function mountMenu(){
  const nav=document.querySelector('.side-menu-nav');
  if(!nav)return;
  const admin=q('sideAdminItem');
  if(!q('sideRankingItem')){
    const b=document.createElement('button');
    b.id='sideRankingItem';b.className='side-menu-item';b.dataset.sideView='ranking';
    b.innerHTML='<span class="side-menu-icon">#</span><span class="side-menu-copy"><span class="side-menu-title">Ranking</span><span class="side-menu-sub">Lucro dos usuários</span></span>';
    nav.insertBefore(b,admin||null);
  }
  if(!q('sideSettingsItem')){
    const b=document.createElement('button');
    b.id='sideSettingsItem';b.className='side-menu-item';b.dataset.sideView='settings';
    b.innerHTML='<span class="side-menu-icon">⚙</span><span class="side-menu-copy"><span class="side-menu-title">Configurações</span><span class="side-menu-sub">Nome e foto do perfil</span></span>';
    nav.insertBefore(b,admin||null);
  }
  const dashTitle=q('sideDashboardItem')?.querySelector('.side-menu-title');
  const profitTitle=q('sideProfitItem')?.querySelector('.side-menu-title');
  if(dashTitle)dashTitle.textContent='Planejamento';
  if(profitTitle)profitTitle.textContent='Metas e Fechamento';
}

function hideAddonViews(){q('rankingView')?.classList.add('hidden');q('settingsView')?.classList.add('hidden')}
function hideNativeViews(){
  document.querySelectorAll('.dashboard-view').forEach(el=>el.classList.add('hidden'));
  ['profitView','achievementsView','gamesView','adminView'].forEach(id=>q(id)?.classList.add('hidden'));
}
function setActive(view){document.querySelectorAll('[data-side-view]').forEach(el=>el.classList.toggle('active',el.dataset.sideView===view))}
function closeMenu(){
  q('sideMenu')?.classList.remove('open');q('sideMenuOverlay')?.classList.remove('open');q('mainMenuToggle')?.setAttribute('aria-expanded','false');q('sideMenu')?.setAttribute('aria-hidden','true');document.body.classList.remove('side-menu-open');
}
async function showRanking(){hideNativeViews();q('settingsView')?.classList.add('hidden');q('rankingView')?.classList.remove('hidden');setActive('ranking');closeMenu();await loadRanking()}
async function showSettings(){hideNativeViews();q('rankingView')?.classList.add('hidden');q('settingsView')?.classList.remove('hidden');setActive('settings');closeMenu();await ensureProfile();renderSettings()}

function bindNativeNavCleanup(){
  ['sideDashboardItem','sideProfitItem','sideGamesItem','sideAchievementsItem','sideAdminItem','dashboardTab','profitTab','gamesTab','achievementsTab','adminTab'].forEach(id=>{
    const el=q(id);if(el&&!el.dataset.erCleanup){el.dataset.erCleanup='1';el.addEventListener('click',hideAddonViews)}
  });
}

async function ensureProfile(){
  const u=currentUser(),client=db();if(!u||!client)return null;
  const res=await client.from('cpa_profiles').select('user_id,display_name,avatar_data,updated_at').eq('user_id',u.id).maybeSingle();
  if(res.error){console.warn('profile load',res.error);return null}
  if(res.data){state.profile=res.data;applyProfile();return res.data}
  const base=(String(u.email||'').split('@')[0]||'Usuário').replace(/[._-]+/g,' ').trim().slice(0,30)||'Usuário';
  const ins=await client.from('cpa_profiles').insert({user_id:u.id,display_name:base}).select('user_id,display_name,avatar_data,updated_at').single();
  if(ins.error){console.warn('profile create',ins.error);return null}
  state.profile=ins.data;applyProfile();return ins.data;
}

function applyProfile(){
  const p=state.profile||{display_name:'Usuário',avatar_data:null};
  const top=document.querySelector('#appScreen > .top > div:first-child');
  if(top){
    top.classList.add('er-greeting-wrap');
    let avatar=q('erHeaderAvatar');
    if(!avatar){avatar=document.createElement('div');avatar.id='erHeaderAvatar';top.prepend(avatar)}
    avatar.innerHTML=avatarMarkup(p,'normal');
    let copy=top.querySelector('.er-greeting-copy');
    if(!copy){
      const h=top.querySelector('h1'),m=top.querySelector('.muted');
      copy=document.createElement('div');copy.className='er-greeting-copy';
      if(h)copy.appendChild(h);if(m)copy.appendChild(m);top.appendChild(copy);
    }
    const h=copy.querySelector('h1');if(h)h.innerHTML=`Olá, <span>${safe(p.display_name)}</span>`;
    const m=copy.querySelector('.muted');if(m)m.textContent='Dashboard de Lucro CPA — Equipe Rico';
  }
  renderSettings();
}

function renderSettings(){
  if(!q('settingsView'))return;
  const p=state.profile||{display_name:'Usuário',avatar_data:null};
  q('erProfileAvatarPreview').innerHTML=avatarMarkup(p,'large');
  q('erProfilePreviewName').textContent=p.display_name||'Usuário';
  if(q('erDisplayName')&&document.activeElement!==q('erDisplayName'))q('erDisplayName').value=p.display_name||'';
}

async function compressAvatar(file){
  if(!file)return null;
  if(!/^image\/(jpeg|png|webp)$/i.test(file.type))throw new Error('Use uma imagem JPG, PNG ou WEBP.');
  if(file.size>6*1024*1024)throw new Error('A imagem deve ter no máximo 6 MB.');
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));r.readAsDataURL(file)});
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Imagem inválida.'));i.src=data});
  const size=220,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');
  const scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale,x=(size-w)/2,y=(size-h)/2;
  ctx.fillStyle='#111';ctx.fillRect(0,0,size,size);ctx.drawImage(img,x,y,w,h);
  const out=canvas.toDataURL('image/jpeg',.78);
  if(out.length>330000)throw new Error('Não foi possível reduzir essa foto. Tente outra imagem.');
  return out;
}

async function saveProfile(){
  const u=currentUser(),client=db(),name=q('erDisplayName')?.value.trim(),msg=q('erProfileMsg');if(!u||!client)return;
  if(!name||name.length>30){if(msg)msg.textContent='Digite um nome de 1 a 30 caracteres.';return}
  const btn=q('erSaveProfile');if(btn){btn.disabled=true;btn.textContent='Salvando...'}
  try{
    let avatar=state.profile?.avatar_data||null;
    const file=q('erAvatarFile')?.files?.[0];if(file)avatar=await compressAvatar(file);
    const res=await client.from('cpa_profiles').upsert({user_id:u.id,display_name:name,avatar_data:avatar,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('user_id,display_name,avatar_data,updated_at').single();
    if(res.error)throw res.error;
    state.profile=res.data;applyProfile();if(q('erAvatarFile'))q('erAvatarFile').value='';if(msg)msg.textContent='Perfil salvo com sucesso.';await loadRanking();
  }catch(e){console.error(e);if(msg)msg.textContent=e?.message||'Não foi possível salvar o perfil.'}
  finally{if(btn){btn.disabled=false;btn.textContent='Salvar perfil'}}
}
async function removeAvatar(){
  const u=currentUser(),client=db(),msg=q('erProfileMsg');if(!u||!client)return;
  const res=await client.from('cpa_profiles').update({avatar_data:null,updated_at:new Date().toISOString()}).eq('user_id',u.id).select('user_id,display_name,avatar_data,updated_at').single();
  if(res.error){if(msg)msg.textContent='Não foi possível remover a foto.';return}
  state.profile=res.data;applyProfile();if(q('erAvatarFile'))q('erAvatarFile').value='';if(msg)msg.textContent='Foto removida.';await loadRanking();
}

async function loadRanking(){
  const client=db(),u=currentUser(),rows=q('erRankingRows');if(!client||!u||!rows)return;
  rows.className='er-empty';rows.textContent='Atualizando ranking...';
  const range=periodRange(state.rankingPeriod);
  const [rankRes,profileRes]=await Promise.all([
    client.from('cpa_rank_daily').select('user_id,day,profit').gte('day',range.start).lte('day',range.end),
    client.from('cpa_profiles').select('user_id,display_name,avatar_data')
  ]);
  if(rankRes.error||profileRes.error){console.error(rankRes.error||profileRes.error);rows.textContent='Não foi possível carregar o ranking agora.';return}
  const totals=new Map();for(const r of (rankRes.data||[]))totals.set(r.user_id,(totals.get(r.user_id)||0)+Number(r.profit||0));
  const profiles=new Map((profileRes.data||[]).map(p=>[p.user_id,p]));
  const list=[...totals.entries()].map(([user_id,profit])=>({user_id,profit,profile:profiles.get(user_id)||{display_name:'Usuário',avatar_data:null}})).sort((a,b)=>b.profit-a.profit||String(a.profile.display_name).localeCompare(String(b.profile.display_name),'pt-BR'));
  document.querySelectorAll('[data-rank-period]').forEach(b=>b.classList.toggle('active',b.dataset.rankPeriod===state.rankingPeriod));
  if(!list.length){rows.className='er-empty';rows.textContent='Ainda não há lucro registrado neste período.';return}
  rows.className='';rows.innerHTML=list.map((r,i)=>`<div class="er-ranking-row ${r.user_id===u.id?'me':''}"><div class="er-rank-pos">${i+1}º</div><div class="er-rank-user">${avatarMarkup(r.profile,'small')}<div><div class="er-rank-name">${safe(r.profile.display_name||'Usuário')}</div>${r.user_id===u.id?'<div class="er-rank-you">VOCÊ</div>':''}</div></div><div class="er-rank-profit">${r.profit>0?'+':''}${money(r.profit)}</div></div>`).join('');
}

function bind(){
  if(state.bound)return;state.bound=true;
  q('sideRankingItem').onclick=showRanking;q('sideSettingsItem').onclick=showSettings;
  q('erRankRefresh').onclick=loadRanking;
  document.querySelectorAll('[data-rank-period]').forEach(b=>b.onclick=async()=>{state.rankingPeriod=b.dataset.rankPeriod;await loadRanking()});
  q('erSaveProfile').onclick=saveProfile;q('erRemoveAvatar').onclick=removeAvatar;
  q('erAvatarFile').onchange=async()=>{
    const file=q('erAvatarFile').files?.[0];if(!file)return;
    try{const avatar=await compressAvatar(file);const preview={display_name:q('erDisplayName').value.trim()||state.profile?.display_name||'Usuário',avatar_data:avatar};q('erProfileAvatarPreview').innerHTML=avatarMarkup(preview,'large');q('erProfilePreviewName').textContent=preview.display_name}catch(e){q('erProfileMsg').textContent=e.message;q('erAvatarFile').value=''}
  };
  q('erDisplayName').oninput=()=>{q('erProfilePreviewName').textContent=q('erDisplayName').value.trim()||'Usuário'};
  bindNativeNavCleanup();
}

async function bootAddon(){
  injectStyles();mountViews();mountMenu();bind();
  const wait=async()=>{
    if(currentUser()&&db()){
      await ensureProfile();
      if(!state.rankingTimer)state.rankingTimer=setInterval(()=>{if(!q('rankingView')?.classList.contains('hidden'))loadRanking()},15000);
    }else setTimeout(wait,500);
  };
  wait();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootAddon,{once:true});else bootAddon();
console.info('Equipe Rico profile/ranking addon',ADDON_VERSION);
})();