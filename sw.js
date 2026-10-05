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
    let text=await response.text();
    if(text.includes(ACHIEVEMENT_OLD))text=text.replace(ACHIEVEMENT_OLD,ACHIEVEMENT_NEW);
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
