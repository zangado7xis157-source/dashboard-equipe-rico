async function invokeProvider(body){
  if(!sb) throw new Error('auth_not_ready');
  const {data,error}=await sb.functions.invoke('rico-proxy-provider',{body});
  if(error) throw error;
  if(data?.error) throw new Error(data.error);
  return data;
}

function providerErrorMessage(code){
  const map={
    provider_not_configured:'A integração com o fornecedor ainda precisa da chave privada da NextProxy no servidor.',
    no_active_plan:'Você ainda não possui um plano ativo.',
    unauthorized:'Entre na sua conta novamente.',
    proxy_extract_traffic_exhausted:'O tráfego deste produto acabou. Faça uma recarga.',
    egress_ip_unavailable:'Não foi possível preparar a conexão segura com o fornecedor.',
    auth_not_ready:'A sessão ainda está carregando. Tente novamente em alguns segundos.'
  };
  return map[code]||`Não foi possível concluir: ${code}`;
}

function refreshGeneratorStatus(){
  const output=document.querySelector('.proxy-output');
  if(!output||output.dataset.generated==='1'||output.dataset.busy==='1') return;
  if(!currentUser){output.textContent='Entre na sua conta e tenha um plano ativo para gerar proxies.';return;}
  if(currentAccount&&currentAccount.status==='active'&&Number(currentAccount.total_bytes)>Number(currentAccount.used_bytes||0)){
    output.textContent='Plano ativo. Escolha as opções acima e clique em Gerar proxy.';
  }else{
    output.textContent='Você precisa ter um plano ativo com tráfego disponível para gerar proxies.';
  }
}

async function syncProviderUsage(){
  if(!currentUser||!currentAccount||currentAccount.status!=='active') return;
  try{
    const result=await invokeProvider({action:'sync'});
    if(result?.data?.configured){ await loadCustomerData(); refreshGeneratorStatus(); }
  }catch(e){ console.warn('Rico Proxy sync:',e.message); }
}

function getGeneratorValues(){
  const box=document.querySelector('.generator');
  const selects=box?.querySelectorAll('select')||[];
  const qty=box?.querySelector('input[type="number"]');
  const label=(selects[0]?.value||'Rotativa').toLowerCase();
  const countryLabel=selects[1]?.value||'Brasil';
  const countryMap={'Brasil':'BR','Estados Unidos':'US','Portugal':'PT'};
  let session='rotating';
  let time;
  if(label.includes('sticky')){ session='sticky'; time=30; }
  return {action:'extract',num:Math.max(1,Math.min(100,Number(qty?.value||1))),session,time,country:countryMap[countryLabel]||'BR'};
}

function formatProxyOutput(data){
  const items=Array.isArray(data?.items)?data.items:[];
  if(!items.length) return 'Nenhuma proxy retornada.';
  const user=data.username||'';
  const pass=data.password||'';
  return items.map(item=>{
    const host=item.ip||item.host||item.address||'';
    const port=item.port||'';
    return user&&pass?`${host}:${port}:${user}:${pass}`:`${host}:${port}`;
  }).join('\n');
}

async function handleGenerate(){
  const generate=document.querySelector('[data-action="generate"]');
  const output=document.querySelector('.proxy-output');
  if(!generate) return;
  if(!currentUser){authForm('login');return;}
  if(!currentAccount||currentAccount.status!=='active'||Number(currentAccount.total_bytes)<=Number(currentAccount.used_bytes||0)){
    alert('Você precisa ter um plano ativo com tráfego disponível para gerar proxies.');
    return;
  }
  const old=generate.textContent;
  generate.disabled=true;
  generate.textContent='Gerando...';
  if(output){output.dataset.generated='0';output.dataset.busy='1';output.textContent='Gerando proxies...';}
  try{
    await invokeProvider({action:'provision'});
    const result=await invokeProvider(getGeneratorValues());
    if(output){output.dataset.generated='1';output.textContent=formatProxyOutput(result.data);}
    await syncProviderUsage();
  }catch(e){
    console.error('Falha ao gerar proxy',e);
    if(output){output.dataset.generated='0';output.textContent=providerErrorMessage(e.message||'erro');}
  }finally{
    if(output) output.dataset.busy='0';
    generate.disabled=false;
    generate.textContent=old;
  }
}

function wireProviderButtons(){
  const generate=document.querySelector('[data-action="generate"]');
  if(generate && generate.dataset.ricoGeneratorReady!=='1'){
    generate.dataset.ricoGeneratorReady='1';
    generate.onclick=handleGenerate;
  }
  refreshGeneratorStatus();
}

(async()=>{
  const wait=()=>new Promise(r=>setTimeout(r,150));
  for(let i=0;i<30 && !window.supabase;i++) await wait();
  wireProviderButtons();
  setTimeout(()=>{wireProviderButtons();syncProviderUsage();},1200);
  setInterval(wireProviderButtons,700);
  setInterval(refreshGeneratorStatus,1500);
})();