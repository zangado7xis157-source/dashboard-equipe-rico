self.addEventListener("install",()=>self.skipWaiting());

self.addEventListener("activate",event=>{
  event.waitUntil(self.clients.claim());
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