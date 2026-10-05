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
  ["alreadyPaidBtn.href = \"https://wa.me/5535910238277?text=gostaria%20de%20saber%20minha%20key%20do%20dashabord%0A\";","alreadyPaidBtn.href = \"https://wa.me/5535910238277?text=ja%20paguei%20o%20acesso%20vitalicio%20de%20R%2429%2C99%20e%20quero%20minha%20key%20vitalicia%20do%20dashboard\";"]
];

function patchDashboardHtml(text){
  if(text.includes(ACHIEVEMENT_OLD))text=text.replace(ACHIEVEMENT_OLD,ACHIEVEMENT_NEW);
  for(const [oldValue,newValue] of LIFETIME_REPLACEMENTS){
    if(text.includes(oldValue))text=text.split(oldValue).join(newValue);
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
