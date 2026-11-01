async function ricoCallFunction(name, body){
  const s=await sb.auth.getSession();
  const token=s.data.session?.access_token;
  if(!token) throw new Error('Sessão expirada');
  const r=await fetch(`${SUPABASE_URL}/functions/v1/${name}`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'apikey':SUPABASE_KEY},
    body:JSON.stringify(body||{})
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error){const e=new Error(j.error||'Falha na operação');e.code=j.error;e.data=j;throw e;}
  return j;
}

function moneyBR(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function stockErrorMessage(e){
  const c=e?.code||e?.message;
  if(c==='insufficient_provider_stock') return 'Este pacote está temporariamente sem estoque. Escolha uma quantidade menor ou tente novamente após a reposição.';
  if(c==='pending_payment_exists') return 'Já existe um Pix ativo nesta conta. O código pendente será recuperado automaticamente.';
  if(c==='sales_paused') return 'Novas compras estão temporariamente pausadas.';
  if(c==='stock_check_failed'||c==='provider_not_configured') return 'Não foi possível confirmar o estoque agora. Tente novamente em instantes.';
  return e?.message||'Não foi possível gerar o Pix.';
}

async function getRicoStock(){
  try{
    const r=await fetch(`${SUPABASE_URL}/functions/v1/rico-proxy-stock-status`,{headers:{'apikey':SUPABASE_KEY}});
    return await r.json();
  }catch{return {available:false,status:'error'};}
}

async function getOwnPendingPix(){
  if(!currentUser?.id) return null;
  const {data,error}=await sb.from('rico_proxy_payments')
    .select('id,gb,amount,pix_payload,pix_expiration,created_at')
    .eq('user_id',currentUser.id)
    .eq('status','pending')
    .is('credited_at',null)
    .order('created_at',{ascending:false})
    .limit(1)
    .maybeSingle();
  if(error||!data?.pix_payload) return null;
  return {
    paymentId:data.id,
    gb:data.gb,
    amount:data.amount,
    pixPayload:data.pix_payload,
    expirationDate:data.pix_expiration,
    reused:true
  };
}

let ricoQrLoaderPromise=null;
function ensureRicoQrLibrary(){
  if(window.QRCode) return Promise.resolve();
  if(ricoQrLoaderPromise) return ricoQrLoaderPromise;
  ricoQrLoaderPromise=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-rico-qrcode]');
    if(existing){
      existing.addEventListener('load',()=>resolve(),{once:true});
      existing.addEventListener('error',()=>reject(new Error('qr_load_failed')),{once:true});
      return;
    }
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    s.async=true;
    s.dataset.ricoQrcode='1';
    s.onload=()=>resolve();
    s.onerror=()=>reject(new Error('qr_load_failed'));
    document.head.appendChild(s);
  });
  return ricoQrLoaderPromise;
}

async function renderRicoQr(payload){
  const box=document.querySelector('#rp-qr-generated');
  if(!box||!payload) return;
  try{
    await ensureRicoQrLibrary();
    box.innerHTML='';
    new QRCode(box,{text:payload,width:190,height:190,correctLevel:QRCode.CorrectLevel.M});
  }catch{
    box.innerHTML='<small style="color:#94a3b8">Não foi possível gerar o QR Code. Use o Pix copia e cola abaixo.</small>';
  }
}

function showRicoPix(j){
  const reused=!!j.reused;
  const img=j.pixEncodedImage?`<img src="data:image/png;base64,${j.pixEncodedImage}" alt="QR Code Pix" style="width:190px;max-width:100%;display:block;margin:14px auto;border-radius:12px;background:white;padding:8px">`:`<div id="rp-qr-generated" style="width:206px;min-height:206px;margin:14px auto;padding:8px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center"></div>`;
  content.innerHTML=`<h3>${reused?'Pix pendente encontrado':'Pix gerado'}</h3>
    <p>${reused?'Você já tinha um Pix ativo nesta conta. Use o QR Code ou o código abaixo para concluir o pagamento.':'Seu Pix foi criado com sucesso.'}</p>
    <p><b>${j.gb} GB</b> — ${moneyBR(j.amount)}</p>${img}
    <div class="field"><label>Pix copia e cola</label><textarea id="rp-pix" readonly style="min-height:100px;background:#080d15;color:#dce7f9;border:1px solid #1a2b46;border-radius:9px;padding:10px;width:100%">${j.pixPayload}</textarea></div>
    <button class="outline full" id="rp-copy">Copiar código Pix</button>
    <button class="primary full" id="rp-verify" style="margin-top:10px">Já paguei — verificar</button>
    <div id="rp-verify-feedback"></div>`;

  if(!j.pixEncodedImage) renderRicoQr(j.pixPayload);

  document.querySelector('#rp-copy').onclick=async()=>{
    await navigator.clipboard.writeText(j.pixPayload);
    document.querySelector('#rp-copy').textContent='Código copiado!';
  };

  document.querySelector('#rp-verify').onclick=async()=>{
    const vb=document.querySelector('#rp-verify');
    const vf=document.querySelector('#rp-verify-feedback');
    vf.innerHTML='';vb.disabled=true;vb.textContent='Verificando...';
    try{
      const v=await ricoCallFunction('rico-proxy-verify-payment',{paymentId:j.paymentId});
      if(v.paid||v.credited){
        vf.append(showMessage('Pagamento confirmado! GB adicionados à sua conta.'));
        await loadCustomerData();
        vb.textContent='Pagamento confirmado';
      }else{
        vf.append(showMessage('Pagamento ainda não confirmado. Tente novamente em alguns instantes.'));
        vb.disabled=false;vb.textContent='Já paguei — verificar';
      }
    }catch(e){
      vf.append(showMessage(e.message||'Erro ao verificar pagamento.','error'));
      vb.disabled=false;vb.textContent='Já paguei — verificar';
    }
  };
}

async function openRicoRecharge(){
  if(!currentUser){authForm('login');return;}
  const stock=await getRicoStock();
  if(!stock.available){
    content.innerHTML=`<h3>Estoque temporariamente indisponível</h3><p>No momento não há tráfego suficiente para novas compras ou recargas. Seu saldo atual continua salvo normalmente.</p><button class="primary full" id="rp-close-stock">Entendi</button>`;
    modal.classList.add('open');document.querySelector('#rp-close-stock').onclick=close;return;
  }
  const {data:plans,error}=await sb.from('rico_proxy_plans').select('id,gb,price').eq('active',true).order('gb');
  const sellable=(plans||[]).filter(p=>Number(p.gb)<=Number(stock.availableForSaleGB||0));
  if(error||!sellable.length){alert('Nenhum pacote disponível no momento.');return;}
  const options=sellable.map(p=>`<option value="${p.id}">${p.gb} GB — ${moneyBR(p.price)}</option>`).join('');
  content.innerHTML=`<h3>Escolha seu pacote</h3>
  <p>Selecione a quantidade de GB. O pagamento será via Pix e, após a confirmação, os GB serão adicionados automaticamente à mesma conta.</p>
  ${stock.low?'<div style="margin:10px 0;padding:10px 12px;border-radius:10px;background:#231b08;border:1px solid #66511a;color:#ffd879;font-size:12px">Estoque limitado: alguns pacotes podem ficar indisponíveis.</div>':''}
  <div class="field"><label>Pacote</label><select id="rp-plan">${options}</select></div>
  <div class="field"><label>CPF ou CNPJ</label><input id="rp-doc" inputmode="numeric" placeholder="Somente números"></div>
  <div class="field"><label>Nome</label><input id="rp-name" placeholder="Seu nome"></div>
  <div id="rp-feedback"></div>
  <button class="primary full" id="rp-create">Gerar Pix</button>`;
  modal.classList.add('open');
  const nameInput=document.querySelector('#rp-name');
  if(nameInput) nameInput.value=currentUser.user_metadata?.display_name||currentUser.email?.split('@')[0]||'';
  document.querySelector('#rp-create').onclick=async()=>{
    const btn=document.querySelector('#rp-create');
    const fb=document.querySelector('#rp-feedback');
    fb.innerHTML='';
    const planId=document.querySelector('#rp-plan').value;
    const cpfCnpj=document.querySelector('#rp-doc').value.replace(/\D/g,'');
    const name=document.querySelector('#rp-name').value.trim();
    if(![11,14].includes(cpfCnpj.length)){fb.append(showMessage('Digite um CPF ou CNPJ válido.','error'));return;}
    btn.disabled=true;btn.textContent='Gerando Pix...';
    try{
      const j=await ricoCallFunction('rico-proxy-create-payment',{planId,cpfCnpj,name});
      showRicoPix(j);
    }catch(e){
      if(e?.code==='pending_payment_exists'){
        const pending=await getOwnPendingPix();
        if(pending){showRicoPix(pending);return;}
      }
      fb.append(showMessage(stockErrorMessage(e),'error'));
      btn.disabled=false;btn.textContent='Gerar Pix';
    }
  };
}

async function refreshStockBadge(){
  const plans=document.querySelector('#plans .section-head');if(!plans)return;
  let badge=document.querySelector('#rico-stock-badge');if(!badge){badge=document.createElement('div');badge.id='rico-stock-badge';badge.style.cssText='margin:14px auto 0;max-width:520px;padding:10px 12px;border-radius:10px;font-size:12px';plans.appendChild(badge);}
  const s=await getRicoStock();
  if(s.available){badge.textContent=s.low?'⚠ Estoque limitado — alguns pacotes podem ficar indisponíveis.':'● Estoque disponível para novas ativações';badge.style.background=s.low?'#231b08':'#071c14';badge.style.border=s.low?'1px solid #66511a':'1px solid #16593d';badge.style.color=s.low?'#ffd879':'#67dda5';}
  else{badge.textContent='Estoque temporariamente indisponível para novas ativações';badge.style.background='#281015';badge.style.border='1px solid #6b2530';badge.style.color='#ff9aa8';}
}

setInterval(()=>{
  if(typeof sb==='undefined'||!sb) return;
  document.querySelectorAll('[data-action="recharge"]').forEach(b=>{
    if(b.dataset.ricoPixReady==='1') return;
    b.dataset.ricoPixReady='1';
    b.onclick=openRicoRecharge;
  });
},700);
setTimeout(refreshStockBadge,1200);setInterval(refreshStockBadge,60000);
