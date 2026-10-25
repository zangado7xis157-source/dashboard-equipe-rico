const state = {
  user: { name: 'Administrador', email: 'admin@empresa.com' },
  providerConnected: false,
  payments: [
    { id:'PAY-1048', customer:'Marina Souza', email:'marina@email.com', amount:189.90, method:'Pix', status:'approved', date:'24/10/2026', time:'20:42' },
    { id:'PAY-1047', customer:'Lucas Lima', email:'lucas@email.com', amount:59.90, method:'Pix', status:'pending', date:'24/10/2026', time:'19:58' },
    { id:'PAY-1046', customer:'Ana Ribeiro', email:'ana@email.com', amount:299.00, method:'Cartão', status:'approved', date:'24/10/2026', time:'18:21' },
    { id:'PAY-1045', customer:'Carlos Mendes', email:'carlos@email.com', amount:79.90, method:'Cartão', status:'failed', date:'24/10/2026', time:'17:35' },
    { id:'PAY-1044', customer:'Rafael Costa', email:'rafael@email.com', amount:149.00, method:'Boleto', status:'refunded', date:'23/10/2026', time:'15:02' },
  ],
  paymentLinks: [
    {name:'Plano Pro', amount:59.90, payments:18, status:'Ativo', created:'20/10/2026', expires:'—'},
    {name:'Consultoria', amount:299.00, payments:4, status:'Ativo', created:'18/10/2026', expires:'30/11/2026'},
  ],
  customers: [
    {name:'Marina Souza', email:'marina@email.com', total:1249.50, orders:8, last:'24/10/2026', status:'Ativo'},
    {name:'Lucas Lima', email:'lucas@email.com', total:459.20, orders:5, last:'24/10/2026', status:'Ativo'},
    {name:'Ana Ribeiro', email:'ana@email.com', total:1798.00, orders:11, last:'24/10/2026', status:'Ativo'},
  ],
  page:'dashboard'
};

const navItems = [
  ['dashboard','◫','Dashboard'],['payments','↔','Pagamentos'],['create-charge','＋','Criar cobrança'],['payment-links','🔗','Links de pagamento'],['customers','♙','Clientes'],['withdrawals','⇩','Saques'],['reports','▥','Relatórios'],['integrations','⌁','Integrações'],['webhooks','◎','Webhooks'],['api','{ }','API'],['settings','⚙','Configurações'],['support','?','Suporte']
];

const el = id => document.getElementById(id);
const money = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const labels = {approved:'Aprovado',pending:'Pendente',failed:'Recusado',cancelled:'Cancelado',refunded:'Reembolsado'};

function toast(msg){const t=el('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2600)}
function renderNav(){el('nav').innerHTML=navItems.map(([id,icon,label])=>`<button data-page="${id}" class="${state.page===id?'active':''}"><span>${icon}</span>${label}</button>`).join('');}
function setPage(page){state.page=page;renderNav();renderPage();el('sidebar').classList.remove('open');}
function pageTitle(title,kicker='Painel administrativo'){el('pageTitle').textContent=title;el('pageKicker').textContent=kicker;}
function statusBadge(s){return `<span class="status ${s}">${labels[s]||s}</span>`}

function renderPage(){
  const c=el('content');
  if(state.page==='dashboard') return renderDashboard(c);
  if(state.page==='payments') return renderPayments(c);
  if(state.page==='create-charge') return renderCreateCharge(c);
  if(state.page==='payment-links') return renderPaymentLinks(c);
  if(state.page==='customers') return renderCustomers(c);
  if(state.page==='withdrawals') return renderWithdrawals(c);
  if(state.page==='reports') return renderReports(c);
  if(state.page==='integrations') return renderIntegrations(c);
  if(state.page==='webhooks') return renderWebhooks(c);
  if(state.page==='api') return renderApi(c);
  if(state.page==='settings') return renderSettings(c);
  if(state.page==='support') return renderSupport(c);
  if(state.page==='notifications') return renderNotifications(c);
}

function renderDashboard(c){
  pageTitle('Dashboard','Visão geral');
  const approved=state.payments.filter(p=>p.status==='approved');
  const total=approved.reduce((a,p)=>a+p.amount,0);
  c.innerHTML=`
    <div class="notice"><b>ⓘ</b><span>Modo demonstração: os valores abaixo são dados ilustrativos. Nenhum pagamento real é processado até uma integração autorizada ser conectada.</span></div>
    <div class="grid cards" style="margin-top:16px">
      ${metric('Saldo disponível',money(total*0.82),'+8,2%','green','Disponível após liquidação')}
      ${metric('Total recebido',money(total),'+12,4%','green','Período demonstrativo')}
      ${metric('Pagamentos hoje',money(total),'3 aprovados','green','Atualizado agora')}
      ${metric('Pendentes',money(state.payments.filter(p=>p.status==='pending').reduce((a,p)=>a+p.amount,0)),'1 cobrança','yellow','Aguardando confirmação')}
    </div>
    <div class="section-grid">
      <div class="card"><div class="card-head"><div><h2>Faturamento</h2><p>Últimos 7 dias</p></div><select class="input" style="max-width:150px"><option>7 dias</option><option>30 dias</option><option>Este mês</option></select></div>
        <div class="chart">${[36,54,41,72,64,88,76].map((h,i)=>`<div class="bar-wrap"><div class="bar" style="height:${h}%"></div><span>${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'][i]}</span></div>`).join('')}</div>
      </div>
      <div class="card"><div class="card-head"><div><h2>Atividade recente</h2><p>Últimas movimentações</p></div></div><div class="activity">
        ${state.payments.slice(0,4).map(p=>`<div class="activity-item"><span class="activity-dot" style="background:${p.status==='approved'?'var(--green)':p.status==='pending'?'var(--yellow)':'var(--red)'}"></span><div><strong>${p.customer}</strong><small>${p.method} • ${p.time}</small></div><span class="amount">${money(p.amount)}</span></div>`).join('')}
      </div></div>
    </div>`;
}
function metric(name,value,pill,pillClass,small){return `<div class="card metric-card"><div class="metric-top"><h3>${name}</h3><span class="pill ${pillClass}">${pill}</span></div><strong>${value}</strong><small>${small}</small></div>`}

function renderPayments(c){
  pageTitle('Pagamentos','Transações');
  c.innerHTML=`<div class="card"><div class="card-head"><div><h2>Todos os pagamentos</h2><p>Pesquise, filtre e abra os detalhes de cada transação.</p></div><button class="primary-btn" data-page="create-charge">+ Nova cobrança</button></div>
  <div class="toolbar"><input id="paymentSearch" class="input" placeholder="Buscar por ID, cliente ou e-mail"><select id="statusFilter" class="input"><option value="">Todos os status</option><option value="approved">Aprovado</option><option value="pending">Pendente</option><option value="failed">Recusado</option><option value="refunded">Reembolsado</option></select><select class="input"><option>Todos os métodos</option><option>Pix</option><option>Cartão</option><option>Boleto</option></select></div><div id="paymentsTable"></div></div>`;
  drawPayments();
  el('paymentSearch').addEventListener('input',drawPayments);el('statusFilter').addEventListener('change',drawPayments);
}
function drawPayments(){
  const root=el('paymentsTable'); if(!root)return;
  const q=(el('paymentSearch')?.value||'').toLowerCase(), s=el('statusFilter')?.value||'';
  const list=state.payments.filter(p=>(!q||`${p.id} ${p.customer} ${p.email}`.toLowerCase().includes(q))&&(!s||p.status===s));
  root.innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Cliente</th><th>Valor</th><th>Método</th><th>Status</th><th>Data</th><th>Horário</th><th>Ações</th></tr></thead><tbody>${list.map(p=>`<tr><td>${p.id}</td><td><strong>${p.customer}</strong><br><small class="muted">${p.email}</small></td><td>${money(p.amount)}</td><td>${p.method}</td><td>${statusBadge(p.status)}</td><td>${p.date}</td><td>${p.time}</td><td><button class="ghost-btn" data-payment="${p.id}">Ver detalhes</button></td></tr>`).join('')}</tbody></table></div>`;
}

function renderCreateCharge(c){
  pageTitle('Criar cobrança','Recebimentos');
  c.innerHTML=`<div class="card form-card"><div class="card-head"><div><h2>Nova cobrança</h2><p>Preencha os dados abaixo. Cobranças reais exigem um provedor conectado.</p></div></div>
  ${!state.providerConnected?'<div class="notice"><b>!</b><span>Nenhum provedor de pagamentos conectado. Você pode montar a cobrança, mas o checkout real ficará indisponível.</span></div>':''}
  <form id="chargeForm" class="form-stack" style="margin-top:18px"><div class="form-grid">
    <label class="span-2">Descrição<input name="description" required placeholder="Ex.: Plano mensal"></label>
    <label>Nome do cliente<input name="customer" required placeholder="Nome completo"></label><label>E-mail<input type="email" name="email" required placeholder="cliente@email.com"></label>
    <label>Telefone<input name="phone" placeholder="(00) 00000-0000"></label><label>CPF/CNPJ<input name="document" placeholder="Opcional"></label>
    <label>Valor (R$)<input name="amount" type="number" step="0.01" min="1" required placeholder="59,90"></label><label>Vencimento<input name="due" type="date"></label>
    <label class="span-2">Método<select name="method"><option>Pix</option><option>Cartão</option><option>Boleto</option></select></label>
  </div><div class="form-actions"><button type="button" class="ghost-btn" data-page="payments">Cancelar</button><button class="primary-btn" type="submit">Criar cobrança</button></div></form></div>`;
  el('chargeForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target);const amount=Number(fd.get('amount'));const id='PAY-'+Math.floor(1050+Math.random()*800);state.payments.unshift({id,customer:fd.get('customer'),email:fd.get('email'),amount,method:fd.get('method'),status:'pending',date:'24/10/2026',time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});showModal(`<span class="eyebrow">COBRANÇA CRIADA</span><h2>${id}</h2><p class="muted">A cobrança foi criada localmente em modo demonstração.</p><div class="card" style="margin-top:18px"><div class="kv"><span>Valor</span><strong>${money(amount)}</strong></div><div class="kv"><span>Status</span>${statusBadge('pending')}</div><div class="kv"><span>Método</span><strong>${fd.get('method')}</strong></div></div><div class="notice" style="margin-top:14px"><b>ⓘ</b><span>Conecte um provedor autorizado para gerar QR Code Pix, boleto ou tokenização de cartão reais.</span></div>`);toast('Cobrança criada em modo demonstração.');e.target.reset();});
}
