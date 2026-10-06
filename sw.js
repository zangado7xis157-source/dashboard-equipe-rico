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

const REPLACEMENTS=[
  ["Para continuar usando o Dashboard de Lucro CPA — Equipe Rico, renove sua mensalidade de R$ 29,99 pelo botão abaixo.","Para continuar usando o Dashboard de Lucro CPA — Equipe Rico, compre o acesso vitalício por R$ 31,99 pelo Pix automático abaixo."],
  ["Pagar R$ 29,99 pelo Nubank pelo Nubank","Gerar Pix — R$ 31,99"],
  ["MENSALIDADE DO DASHBOARD","ACESSO VITALÍCIO DO DASHBOARD"],
  ["R$ 29,99 <span>/ mês</span>","R$ 31,99 <span>pagamento único</span>"],
  ["Mantenha seu acesso ao Dashboard de Lucro CPA — Equipe Rico.","Pague uma vez por Pix e tenha acesso permanente ao Dashboard de Lucro CPA — Equipe Rico."],
  ["Pagar R$ 29,99 pelo Nubank","Gerar Pix — R$ 31,99"],
  ["Jogos exclusivos para assinantes","Jogos exclusivos do acesso vitalício"],
  ["Seu teste grátis de 24 horas continua normalmente no Dashboard. A lista de jogos fica borrada durante o teste e é liberada após o pagamento e ativação da key de 30 dias.","Seu teste grátis de 24 horas continua normalmente no Dashboard. A lista de jogos fica borrada durante o teste e é liberada automaticamente após a confirmação do Pix."],
  ["Liberar jogos — R$ 29,99","Liberar jogos — R$ 31,99"],
  ["Depois que a key for validada, os jogos são liberados automaticamente pelo período pago.","Após a confirmação do Pix, os jogos são liberados automaticamente e o acesso fica vitalício."],
  ["$(\"lockBadge\").textContent=\"Assinatura vencida\";","$(\"lockBadge\").textContent=\"Acesso antigo encerrado\";"],
  ["$(\"lockTitle\").textContent=\"Seus 30 dias de acesso terminaram\";","$(\"lockTitle\").textContent=\"Seu acesso anterior terminou\";"],
  ["$(\"lockText\").textContent=\"Renove sua mensalidade de R$ 29,99 e use uma nova key para liberar mais 30 dias.\";","$(\"lockText\").textContent=\"Agora o acesso é vitalício por R$ 31,99. Gere o Pix e aguarde a confirmação automática.\";"],
  ["$(\"lockText\").textContent=\"O teste grátis de 24 horas é liberado uma única vez por dispositivo/rede. Para continuar, ative a mensalidade de R$ 29,99.\";","$(\"lockText\").textContent=\"O teste grátis de 24 horas é liberado uma única vez por dispositivo/rede. Para continuar, compre o acesso vitalício por R$ 31,99.\";"],
  ["$(\"lockText\").textContent=\"A mensalidade é R$ 29,99. Faça o pagamento e depois use a key recebida para liberar 30 dias de acesso.\";","$(\"lockText\").textContent=\"O acesso vitalício custa R$ 31,99. Gere o Pix e aguarde a confirmação automática do pagamento.\";"],
  ["$(\"trialStatus\").textContent=\"Acesso pago ativo\";","$(\"trialStatus\").textContent=\"Acesso vitalício ativo\";"]
];

const NO_KEY_STYLE='<style id="ricoNoKeyUi">#paidArea,.games-lock-key,.games-lifetime-key{display:none!important}</style>';

const ASAAS_HANDLER=`
let asaasPaymentPoll=null;
function ensureAsaasPaymentModal(){
  let modal=$("asaasPixModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="asaasPixModal";
  modal.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);display:none;align-items:center;justify-content:center;padding:18px;overflow:auto";
  modal.innerHTML='<div style="width:min(520px,100%);background:#07110c;border:1px solid rgba(49,230,124,.34);border-radius:20px;padding:22px;color:#effff4;position:relative">'+
    '<button id="asaasPixClose" type="button" style="position:absolute;right:12px;top:10px;width:38px;height:38px;border-radius:10px;border:1px solid var(--line);background:#0d1a12;color:#eaffef;font-size:20px">×</button>'+
    '<div style="font-size:12px;font-weight:900;color:var(--green);margin-bottom:6px">ACESSO VITALÍCIO</div>'+
    '<h2 style="margin:0 42px 6px 0">Pix automático — R$ 31,99</h2>'+
    '<p style="margin:0 0 16px;color:#9bb2a3;line-height:1.5">Preencha os dados para gerar o Pix. Assim que o Asaas confirmar o pagamento, o acesso será liberado automaticamente.</p>'+
    '<div id="asaasPixForm">'+
      '<label style="display:block;font-size:12px;font-weight:800;margin:10px 0 6px">Nome completo</label>'+
      '<input id="asaasBuyerName" autocomplete="name" placeholder="Seu nome completo" style="width:100%;height:44px;border:1px solid var(--line);border-radius:10px;background:#06100a;color:#effff4;padding:0 12px">'+
      '<label style="display:block;font-size:12px;font-weight:800;margin:12px 0 6px">CPF ou CNPJ</label>'+
      '<input id="asaasBuyerCpf" inputmode="numeric" placeholder="Digite somente os números" style="width:100%;height:44px;border:1px solid var(--line);border-radius:10px;background:#06100a;color:#effff4;padding:0 12px">'+
      '<button id="asaasGeneratePix" type="button" style="width:100%;min-height:46px;margin-top:14px;border:0;border-radius:11px;background:linear-gradient(180deg,var(--green),var(--green2));color:#03120a;font-weight:950">Gerar Pix de R$ 31,99</button>'+
    '</div>'+
    '<div id="asaasPixResult" style="display:none;text-align:center">'+
      '<img id="asaasPixQr" alt="QR Code Pix" style="width:220px;max-width:78vw;background:#fff;border-radius:14px;padding:10px;margin:4px auto 12px;display:none">'+
      '<div style="font-size:12px;color:#9bb2a3;margin-bottom:6px">Pix copia e cola</div>'+
      '<textarea id="asaasPixPayload" readonly style="width:100%;height:88px;border:1px solid var(--line);border-radius:10px;background:#06100a;color:#effff4;padding:10px"></textarea>'+
      '<button id="asaasCopyPix" type="button" style="width:100%;min-height:44px;margin-top:10px;border:1px solid var(--line);border-radius:10px;background:#0d1a12;color:#effff4;font-weight:900">Copiar código Pix</button>'+
      '<button id="asaasVerifyPix" type="button" style="width:100%;min-height:44px;margin-top:8px;border:0;border-radius:10px;background:linear-gradient(180deg,var(--green),var(--green2));color:#03120a;font-weight:950">Já paguei / Verificar pagamento</button>'+
      '<div id="asaasPixExpiration" style="font-size:11px;color:#718579;margin-top:9px"></div>'+
    '</div>'+
    '<div id="asaasPixMsg" style="min-height:20px;margin-top:12px;font-size:12px;color:#9bb2a3;text-align:center"></div></div>';
  document.body.appendChild(modal);
  $("asaasPixClose").onclick=()=>closeAsaasPayment();
  modal.addEventListener("click",e=>{if(e.target===modal)closeAsaasPayment();});
  $("asaasGeneratePix").onclick=createAsaasPixPayment;
  $("asaasVerifyPix").onclick=()=>checkAsaasPaymentStatus(true);
  $("asaasCopyPix").onclick=async()=>{
    const payload=$("asaasPixPayload")?.value||"";
    if(!payload)return;
    try{await navigator.clipboard.writeText(payload);}catch(_){const f=$("asaasPixPayload");f.focus();f.select();document.execCommand("copy");}
    $("asaasPixMsg").textContent="Código Pix copiado!";
  };
  return modal;
}
function closeAsaasPayment(){
  const modal=$("asaasPixModal");
  if(modal)modal.style.display="none";
  if(asaasPaymentPoll){clearInterval(asaasPaymentPoll);asaasPaymentPoll=null;}
}
function openAsaasPayment(){
  if(!user)return alert("Entre na sua conta para gerar o Pix.");
  const modal=ensureAsaasPaymentModal();
  const name=$("asaasBuyerName");
  if(name&&!name.value){const fallback=String(user.user_metadata?.full_name||user.user_metadata?.name||"").trim();if(fallback)name.value=fallback;}
  $("asaasPixMsg").textContent="";
  modal.style.display="flex";
}
async function createAsaasPixPayment(){
  const btn=$("asaasGeneratePix"),msg=$("asaasPixMsg");
  const name=String($("asaasBuyerName")?.value||"").trim();
  const cpfCnpj=String($("asaasBuyerCpf")?.value||"").replace(/\\D/g,"");
  if(name.length<3){msg.textContent="Digite seu nome completo.";return;}
  if(cpfCnpj.length!==11&&cpfCnpj.length!==14){msg.textContent="Digite um CPF ou CNPJ válido, somente com números.";return;}
  btn.disabled=true;btn.textContent="Gerando Pix...";msg.textContent="Criando cobrança segura no Asaas...";
  try{
    const {data,error}=await sb.functions.invoke("create-asaas-payment",{body:{name,cpfCnpj}});
    if(error)throw error;
    if(data?.alreadyPaid){msg.textContent="Seu acesso vitalício já está ativo.";await checkAsaasPaymentStatus(true);return;}
    if(!data?.ok||!data?.pixPayload)throw new Error("pix_error");
    $("asaasPixPayload").value=data.pixPayload;
    const qr=$("asaasPixQr");
    if(data.pixEncodedImage){qr.src=String(data.pixEncodedImage).startsWith("data:")?data.pixEncodedImage:"data:image/png;base64,"+data.pixEncodedImage;qr.style.display="block";}else qr.style.display="none";
    if(data.expirationDate){const d=new Date(data.expirationDate);$("asaasPixExpiration").textContent=Number.isNaN(d.getTime())?"Pix gerado com sucesso.":"Validade do QR Code: "+d.toLocaleString("pt-BR");}else $("asaasPixExpiration").textContent="Pix gerado com sucesso.";
    $("asaasPixForm").style.display="none";$("asaasPixResult").style.display="block";msg.textContent="Pix pronto. Após pagar, a liberação acontece automaticamente.";
    if(asaasPaymentPoll)clearInterval(asaasPaymentPoll);
    asaasPaymentPoll=setInterval(()=>checkAsaasPaymentStatus(false),4000);
  }catch(err){console.error("Asaas Pix",err);msg.textContent="Não foi possível gerar o Pix. Confira seus dados e tente novamente.";}
  finally{btn.disabled=false;btn.textContent="Gerar Pix de R$ 31,99";}
}
async function checkAsaasPaymentStatus(showWaiting){
  const msg=$("asaasPixMsg");
  try{
    const {data,error}=await sb.from("cpa_access").select("*").eq("user_id",user.id).single();
    if(error)throw error;
    const paid=data?.access_status==="paid"&&!data?.paid_until;
    if(!paid){if(showWaiting&&msg)msg.textContent="Pagamento ainda não confirmado. Aguarde alguns segundos e tente novamente.";return false;}
    if(asaasPaymentPoll){clearInterval(asaasPaymentPoll);asaasPaymentPoll=null;}
    accessRow=data;syncGamesAccessUI();if(msg)msg.textContent="✅ Pagamento confirmado! Acesso vitalício liberado.";
    setTimeout(async()=>{closeAsaasPayment();showApp();startCountdown();try{await touchAccount();await loadData();}catch(_){}},900);
    return true;
  }catch(err){console.warn("check Asaas payment",err);if(showWaiting&&msg)msg.textContent="Não foi possível verificar agora. Tente novamente em alguns segundos.";return false;}
}
function setupAutomaticAsaasPayment(){
  const targets=[];
  const main=$("paymentBtn");if(main)targets.push(main);
  document.querySelectorAll(".monthly-payment-btn,.games-payment-link").forEach(el=>targets.push(el));
  targets.forEach(el=>{el.href="#";el.removeAttribute("target");if(el.dataset.asaasBound==="1")return;el.dataset.asaasBound="1";el.addEventListener("click",ev=>{ev.preventDefault();ev.stopImmediatePropagation();openAsaasPayment();},true);});
  const paidArea=$("paidArea");if(paidArea)paidArea.style.display="none";
  document.querySelectorAll(".games-lock-key,.games-lifetime-key").forEach(el=>el.style.display="none");
}
requestAnimationFrame(setupAutomaticAsaasPayment);
`;

function patchDashboardHtml(text){
  if(text.includes(ACHIEVEMENT_OLD))text=text.replace(ACHIEVEMENT_OLD,ACHIEVEMENT_NEW);
  for(const [oldValue,newValue] of REPLACEMENTS){if(text.includes(oldValue))text=text.split(oldValue).join(newValue);}
  if(!text.includes('id="ricoNoKeyUi"'))text=text.replace('</head>',NO_KEY_STYLE+'</head>');
  if(!text.includes('function setupAutomaticAsaasPayment(){')){
    const scriptEnd=text.lastIndexOf('</script>');
    if(scriptEnd!==-1)text=text.slice(0,scriptEnd)+ASAAS_HANDLER+'\n'+text.slice(scriptEnd);
  }
  return text;
}

self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>{event.waitUntil((async()=>{await self.clients.claim();const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});for(const client of clients){try{await client.navigate(client.url)}catch(_){}}})());});
self.addEventListener("fetch",event=>{
  if(event.request.mode!=="navigate")return;
  event.respondWith((async()=>{
    const response=await fetch(event.request,{cache:"no-store"});
    const type=response.headers.get("content-type")||"";
    if(!type.includes("text/html"))return response;
    const text=patchDashboardHtml(await response.text());
    const headers=new Headers(response.headers);headers.set("Cache-Control","no-store, no-cache, must-revalidate");
    return new Response(text,{status:response.status,statusText:response.statusText,headers});
  })());
});
self.addEventListener("push",event=>{
  let data={title:"Equipe Rico",body:"Você tem uma nova notificação.",url:"/"};
  try{if(event.data)data={...data,...event.data.json()};}catch(_){try{data.body=event.data.text()}catch(__){}}
  event.waitUntil(self.registration.showNotification(data.title||"Equipe Rico",{body:data.body||"",data:{url:data.url||"/"},tag:data.tag||undefined}));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=(event.notification.data&&event.notification.data.url)||"/";
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients=>{for(const client of clients){if("focus" in client){try{client.navigate(url)}catch(_){}return client.focus();}}if(self.clients.openWindow)return self.clients.openWindow(url);}));
});
