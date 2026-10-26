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
    egress_ip_unavailable:'Não foi possível preparar a conexão segura com o fornecedor.'
  };
  return map[code]||`Não foi possível concluir: ${code}`;
}

async function syncProviderUsage(){
  if(!currentUser||!currentAccount||currentAccount.status!=='active') return;
  try{
    const result=await invokeProvider({action:'sync'});
    if(result?.data?.configured){ await loadCustomerData(); }
  }catch(e){ console.warn('Rico Proxy sync:',e.message); }
}

function getGeneratorValues(){
  const box=document.querySelector('.generator');
  const selects=box?.querySelectorAll('select')||[];
  const qty=box?.querySelector('input[type="number"]');
  const label=(selects[0]?.value||'Rotativa').toLowerCase();
  const countryLabel=selects[1]?.value||'Brasil';
  const countryMap={'Brasil':'BR','Estados Unidos':'US','Portugal':'PT'};
  let product;
  let session='rotating';
  let time;
  if(label.includes('sticky')){ session='sticky'; time=30; }
  if(label.includes('premium')) product='premium';
  if(label.includes('mobile')) product='mobile';
  return {action:'extract',num:Math.max(1,Math.min(100,Number(qty?.value||1))),session,time,product,country:countryMap[countryLabel]||'BR'};
}

function formatProxyOutput(data){
  const items=Array.isArray(data?.items)?data.items:[];
  if(!items.length) return 'Nenhuma proxy retornada.';
  const user=data.username||'';
  const pass=data.password||'';
  return items.map(item=>{
    const host=item.ip||item.host||'';
    const port=item.port||'';
    return user&&pass?`${host}:${port}:${user}:${pass}`:`${host}:${port}`;
  }).join('\n');
}

function wireProviderButtons(){
  const generate=document.querySelector('[data-action="generate"]');
  if(generate){
    generate.onclick=async()=>{
      if(!currentUser){authForm('login');return;}
      if(!currentAccount||currentAccount.status!=='active'){alert('Você precisa ter um plano ativo para gerar proxies.');return;}
      const output=document.querySelector('.proxy-output');
      const old=generate.textContent;
      generate.disabled=true;generate.textContent='Gerando...';
      if(output) output.textContent='Conectando com a NextProxy...';
      try{
        await invokeProvider({action:'provision'});
        const result=await invokeProvider(getGeneratorValues());
        if(output) output.textContent=formatProxyOutput(result.data);
        await syncProviderUsage();
      }catch(e){
        if(output) output.textContent=providerErrorMessage(e.message||'erro');
      }finally{generate.disabled=false;generate.textContent=old;}
    };
  }
}

(async()=>{
  const wait=()=>new Promise(r=>setTimeout(r,150));
  for(let i=0;i<30 && !window.supabase;i++) await wait();
  wireProviderButtons();
  setTimeout(syncProviderUsage,1200);
})();