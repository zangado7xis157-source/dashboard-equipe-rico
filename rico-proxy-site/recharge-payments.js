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
  if(!r.ok||j.error) throw new Error(j.error||'Falha na operação');
  return j;
}

function moneyBR(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}

async function openRicoRecharge(){
  if(!currentUser){authForm('login');return;}
  const {data:plans,error}=await sb.from('rico_proxy_plans').select('id,gb,price').eq('active',true).order('gb');
  if(error||!plans?.length){alert('Nenhum pacote disponível no momento.');return;}
  const options=plans.map(p=>`<option value="${p.id}">${p.gb} GB — ${moneyBR(p.price)}</option>`).join('');
  content.innerHTML=`<h3>Escolha seu pacote</h3>
  <p>Selecione a quantidade de GB. O pagamento será via Pix e, após a confirmação, os GB serão adicionados automaticamente à mesma conta.</p>
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
      const img=j.pixEncodedImage?`<img src="data:image/png;base64,${j.pixEncodedImage}" alt="QR Code Pix" style="width:190px;max-width:100%;display:block;margin:14px auto;border-radius:12px;background:white;padding:8px">`:'';
      content.innerHTML=`<h3>Pix gerado</h3><p><b>${j.gb} GB</b> — ${moneyBR(j.amount)}</p>${img}
      <div class="field"><label>Pix copia e cola</label><textarea id="rp-pix" readonly style="min-height:100px;background:#080d15;color:#dce7f9;border:1px solid #1a2b46;border-radius:9px;padding:10px;width:100%">${j.pixPayload}</textarea></div>
      <button class="outline full" id="rp-copy">Copiar código Pix</button>
      <button class="primary full" id="rp-verify" style="margin-top:10px">Já paguei — verificar</button>
      <div id="rp-verify-feedback"></div>`;
      document.querySelector('#rp-copy').onclick=async()=>{await navigator.clipboard.writeText(j.pixPayload);document.querySelector('#rp-copy').textContent='Código copiado!'};
      document.querySelector('#rp-verify').onclick=async()=>{
        const vb=document.querySelector('#rp-verify');const vf=document.querySelector('#rp-verify-feedback');vf.innerHTML='';vb.disabled=true;vb.textContent='Verificando...';
        try{
          const v=await ricoCallFunction('rico-proxy-verify-payment',{paymentId:j.paymentId});
          if(v.paid||v.credited){vf.append(showMessage('Pagamento confirmado! GB adicionados à sua conta.'));await loadCustomerData();vb.textContent='Pagamento confirmado';}
          else{vf.append(showMessage('Pagamento ainda não confirmado. Tente novamente em alguns instantes.'));vb.disabled=false;vb.textContent='Já paguei — verificar';}
        }catch(e){vf.append(showMessage(e.message||'Erro ao verificar pagamento.','error'));vb.disabled=false;vb.textContent='Já paguei — verificar';}
      };
    }catch(e){fb.append(showMessage(e.message||'Não foi possível gerar o Pix.','error'));btn.disabled=false;btn.textContent='Gerar Pix';}
  };
}

setInterval(()=>{
  if(typeof sb==='undefined'||!sb) return;
  document.querySelectorAll('[data-action="recharge"]').forEach(b=>{
    if(b.dataset.ricoPixReady==='1') return;
    b.dataset.ricoPixReady='1';
    b.onclick=openRicoRecharge;
  });
},700);
