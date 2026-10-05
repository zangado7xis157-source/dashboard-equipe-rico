const ACHIEVEMENT_OLD=`function totalAchievementProfit(){
  const t=totals(entries);
  return Math.max(0,t.s+t.b-t.d);
}`;

const ACHIEVEMENT_NEW=`function totalAchievementProfit(){
  const sorted=[...entries].sort((a,b)=>{
    const da=String(a.entry_date||"")+" "+String(a.created_at||"");
    const db=String(b.entry_date||"")+" "+String(b.created_at||"");
    return da.localeCompare(db);
  });
  let current=0,peak=0;
  sorted.forEach(e=>{
    const v=Number(e.value||0);
    if(e.entry_type==="deposito"||e.entry_type==="deposito_mae")current-=v;
    if(e.entry_type==="saque"||e.entry_type==="bau")current+=v;
    if(current>peak)peak=current;
  });
  return Math.max(0,peak);
}`;

const LIFETIME_REPLACEMENTS=[
  ["Para continuar usando o Dashboard de Lucro CPA — Equipe Rico, renove sua mensalidade de R$ 29,99 pelo botão abaixo.","Para continuar usando o Dashboard de Lucro CPA — Equipe Rico, compre o acesso vitalício por R$ 29,99 pelo botão abaixo."],
  ["Pagar R$ 29,99 pelo Nubank pelo Nubank","Comprar acesso vitalício — R$ 29,99"],
  ["Depois de concluir o pagamento ou renovação, clique em <strong style=\"color:var(--text)\">Liberar acesso</strong>. Você será direcionado ao WhatsApp para solicitar sua key do dashboard.","Depois de concluir o pagamento, clique em <strong style=\"color:var(--text)\">Liberar acesso</strong>. Você será direcionado ao WhatsApp para solicitar sua key vitalícia do dashboard."],
  ["Quando receber sua key, digite abaixo para continuar. Cada key funciona uma única vez e libera 30 dias.","Quando receber sua key, digite abaixo para continuar. Cada key funciona uma única vez e libera acesso vitalício."],
  ["MENSALIDADE DO DASHBOARD","ACESSO VITALÍCIO DO DASHBOARD"],
  ["R$ 29,99 <span>/ mês</span>","R$ 29,99 <span>pagamento único</span>"],
  ["Mantenha seu acesso ao Dashboard de Lucro CPA — Equipe Rico.","Pague uma vez e tenha acesso permanente ao Dashboard de Lucro CPA — Equipe Rico."],
  ["Pagar R$ 29,99 pelo Nubank","Comprar acesso vitalício — R$ 29,99"],
  ["Jogos exclusivos para assinantes","Jogos exclusivos do acesso vitalício"],
  ["Seu teste grátis de 24 horas continua normalmente no Dashboard. A lista de jogos fica borrada durante o teste e é liberada após o pagamento e ativação da key de 30 dias.","Seu teste grátis de 24 horas continua normalmente no Dashboard. A lista de jogos fica borrada durante o teste e é liberada permanentemente após o pagamento e ativação da key vitalícia."],
  ["https://wa.me/5535910238277?text=ja%20paguei%20a%20mensalidade%20e%20quero%20minha%20key%20do%20dashboard","https://wa.me/5535910238277?text=ja%20paguei%20o%20acesso%20vitalicio%20de%20R%2429%2C99%20e%20quero%20minha%20key%20vitalicia%20do%20dashboard"],
  ["Depois que a key for validada, os jogos são liberados automaticamente pelo período pago.","Depois que a key vitalícia for validada, os jogos ficam liberados permanentemente."],
  ["$(\"lockBadge\").textContent=\"Assinatura vencida\";","$(\"lockBadge\").textContent=\"Acesso antigo encerrado\";"],
  ["$(\"lockTitle\").textContent=\"Seus 30 dias de acesso terminaram\";","$(\"lockTitle\").textContent=\"Seu acesso anterior terminou\";"],
  ["$(\"lockText\").textContent=\"Renove sua mensalidade de R$ 29,99 e use uma nova key para liberar mais 30 dias.\";","$(\"lockText\").textContent=\"Agora o acesso é vitalício por R$ 29,99. Pague uma única vez e use sua key vitalícia.\";"],
  ["$(\"lockText\").textContent=\"O teste grátis de 24 horas é liberado uma única vez por dispositivo/rede. Para continuar, ative a mensalidade de R$ 29,99.\";","$(\"lockText\").textContent=\"O teste grátis de 24 horas é liberado uma única vez por dispositivo/rede. Para continuar, compre o acesso vitalício por R$ 29,99.\";"],
  ["$(\"lockText\").textContent=\"A mensalidade é R$ 29,99. Faça o pagamento e depois use a key recebida para liberar 30 dias de acesso.\";","$(\"lockText\").textContent=\"O acesso vitalício custa R$ 29,99. Faça o pagamento uma única vez e depois use a key recebida para liberar o acesso permanente.\";"],
  ["$(\"trialStatus\").textContent=\"Acesso pago ativo\";","$(\"trialStatus\").textContent=\"Acesso vitalício ativo\";"],
  ["alreadyPaidBtn.href = \"https://wa.me/5535910238277?text=gostaria%20de%20saber%20minha%20key%20do%20dashabord%0A\";","alreadyPaidBtn.href = \"https://wa.me/5535910238277?text=ja%20paguei%20o%20acesso%20vitalicio%20de%20R%2429%2C99%20e%20quero%20minha%20key%20vitalicia%20do%20dashboard\";"],
  ["Acesso liberado por 30 dias. Esta key já foi consumida e não poderá ser usada novamente.","Acesso vitalício liberado. Esta key já foi consumida e não poderá ser usada novamente."]
];

const GAMES_KEY_NOTE_OLD=`<div class="games-lock-note">Depois que a key for validada, os jogos são liberados automaticamente pelo período pago.</div>`;
const GAMES_KEY_NOTE_NEW=`<div class="games-lifetime-key" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">
  <div style="font-weight:900;margin-bottom:8px;color:#eaffef">Já recebeu sua key vitalícia?</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
    <input id="gamesUnlockCode" type="password" placeholder="Digite sua key vitalícia" autocomplete="off" style="flex:1;min-width:200px;max-width:320px;height:44px;border:1px solid var(--line);border-radius:10px;background:#07100b;color:#eaffef;padding:0 12px;outline:none">
    <button id="gamesUnlockBtn" type="button" style="min-height:44px;padding:0 16px;border:0;border-radius:10px;background:linear-gradient(180deg,var(--green),var(--green2));color:#03120a;font-weight:950;cursor:pointer">Ativar key</button>
  </div>
  <div id="gamesUnlockMsg" style="min-height:18px;margin-top:8px;font-size:12px;color:#9bb2a3"></div>
</div>
<div class="games-lock-note">Depois que a key vitalícia for validada, os jogos ficam liberados permanentemente.</div>`;

const GAMES_KEY_HANDLER=`
function setupGamesLifetimeKey(){
  const btn=$("gamesUnlockBtn");
  if(!btn||btn.dataset.bound==="1")return;
  btn.dataset.bound="1";
  btn.onclick=()=>{
    const input=$("gamesUnlockCode");
    const msg=$("gamesUnlockMsg");
    const code=input?input.value.trim():"";
    if(!code){if(msg)msg.textContent="Digite sua key vitalícia.";return;}
    const mainInput=$("unlockCode");
    const mainBtn=$("unlockBtn");
    const mainMsg=$("unlockMsg");
    if(!mainInput||!mainBtn){if(msg)msg.textContent="Não foi possível abrir a validação da key.";return;}
    mainInput.value=code;
    if(mainMsg)mainMsg.textContent="";
    if(msg)msg.textContent="Verificando key...";
    mainBtn.click();
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(hasPaidGamesAccess()){
        clearInterval(timer);
        if(msg)msg.textContent="Acesso vitalício liberado!";
        syncGamesAccessUI();
        return;
      }
      const hiddenText=mainMsg?mainMsg.textContent:"";
      if(hiddenText && hiddenText!=="Verificando key..."){
        clearInterval(timer);
        if(msg)msg.textContent=hiddenText;
        return;
      }
      if(tries>=24){
        clearInterval(timer);
        if(msg)msg.textContent="A validação está demorando. Tente novamente.";
      }
    },250);
  };
}
setTimeout(setupGamesLifetimeKey,0);
`;

function patchDashboardHtml(text){
  if(text.includes(ACHIEVEMENT_OLD))text=text.replace(ACHIEVEMENT_OLD,ACHIEVEMENT_NEW);
  for(const [oldValue,newValue] of LIFETIME_REPLACEMENTS){
    if(text.includes(oldValue))text=text.split(oldValue).join(newValue);
  }
  if(!text.includes('id="gamesUnlockCode"')){
    if(text.includes(GAMES_KEY_NOTE_OLD)){
      text=text.replace(GAMES_KEY_NOTE_OLD,GAMES_KEY_NOTE_NEW);
    }else{
      const lifetimeNote=`<div class="games-lock-note">Depois que a key vitalícia for validada, os jogos ficam liberados permanentemente.</div>`;
      if(text.includes(lifetimeNote))text=text.replace(lifetimeNote,GAMES_KEY_NOTE_NEW);
    }
  }
  if(text.includes('id="gamesUnlockCode"') && !text.includes('function setupGamesLifetimeKey(){')){
    const scriptEnd=text.lastIndexOf('</script>');
    if(scriptEnd!==-1)text=text.slice(0,scriptEnd)+GAMES_KEY_HANDLER+'\n'+text.slice(scriptEnd);
  }
  return text;
}

self.addEventListener("install",()=>self.skipWaiting());

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of clients){
      try{await client.navigate(client.url)}catch(_){}
    }
  })());
});

self.addEventListener("fetch",event=>{
  if(event.request.mode!=="navigate")return;
  event.respondWith((async()=>{
    const response=await fetch(event.request,{cache:"no-store"});
    const type=response.headers.get("content-type")||"";
    if(!type.includes("text/html"))return response;
    let text=patchDashboardHtml(await response.text());
    const headers=new Headers(response.headers);
    headers.set("Cache-Control","no-store, no-cache, must-revalidate");
    return new Response(text,{status:response.status,statusText:response.statusText,headers});
  })());
});

self.addEventListener("push",event=>{
  let data={title:"Equipe Rico",body:"Você tem uma nova notificação.",url:"/"};
  try{
    if(event.data)data={...data,...event.data.json()};
  }catch(_){
    try{data.body=event.data.text()}catch(__){}
  }
  event.waitUntil(
    self.registration.showNotification(data.title||"Equipe Rico",{
      body:data.body||"",
      data:{url:data.url||"/"},
      tag:data.tag||undefined
    })
  );
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=(event.notification.data&&event.notification.data.url)||"/";
  event.waitUntil(
    self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients=>{
      for(const client of clients){
        if("focus" in client){
          try{client.navigate(url)}catch(_){}
          return client.focus();
        }
      }
      if(self.clients.openWindow)return self.clients.openWindow(url);
    })
  );
});
