async function ricoProvider(action){
  const sessionInfo=await sb.auth.getSession();
  const token=sessionInfo.data.session?.access_token;
  if(!token)throw new Error('Sessão expirada');
  const response=await fetch(`${SUPABASE_URL}/functions/v1/rico-proxy-provider`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'apikey':SUPABASE_KEY},
    body:JSON.stringify({action})
  });
  const data=await response.json();
  if(!response.ok||data.error)throw new Error(data.error||'Falha na conexão');
  return data;
}

async function syncTraffic(){
  if(typeof currentUser==='undefined'||!currentUser||typeof currentAccount==='undefined'||!currentAccount)return;
  try{
    await ricoProvider('sync');
    await loadCustomerData();
  }catch(e){console.warn('Falha ao sincronizar tráfego',e)}
}

function bindProviderControls(){
  if(typeof sb==='undefined'||!sb||typeof currentUser==='undefined'||!currentUser)return;
  const actions=document.querySelector('.dash-actions');
  if(!actions||document.querySelector('#provider-sync-btn'))return;
  const button=document.createElement('button');
  button.id='provider-sync-btn';
  button.className='outline';
  button.textContent='Sincronizar GB';
  button.onclick=async()=>{
    button.disabled=true;
    button.textContent='Sincronizando...';
    try{
      await ricoProvider('provision');
      await syncTraffic();
      alert('Consumo sincronizado com a NextProxy.');
    }catch(e){
      alert('Erro NextProxy: '+(e.message||e));
    }finally{
      button.disabled=false;
      button.textContent='Sincronizar GB';
    }
  };
  actions.appendChild(button);
}

setInterval(bindProviderControls,800);
setInterval(syncTraffic,60000);
setTimeout(syncTraffic,2500);