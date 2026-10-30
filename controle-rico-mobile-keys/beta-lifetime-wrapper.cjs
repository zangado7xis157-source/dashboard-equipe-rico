const fs = require('fs');
const path = require('path');

const originalRead = fs.readFileSync.bind(fs);
fs.readFileSync = function(file, ...args) {
  const data = originalRead(file, ...args);
  if (path.basename(String(file)) !== 'server.js') return data;

  let code = String(data);
  const replace = (from, to, label) => {
    if (!code.includes(from)) throw new Error('Patch BOT BETA não encontrado: ' + label);
    code = code.replace(from, to);
  };

  replace(
    "  if(mode==='beta'){\n    const plan=['daily','weekly','monthly','lifetime'].includes(String(body.plan||''))?String(body.plan):'monthly';",
    "  if(mode==='beta_lifetime'){\n    let raw=null;\n    for(let a=0;a<3;a++){\n      raw=newBetaKey();\n      try{await registerBetaKey(raw,'lifetime',label);break}catch(e){if(String(e.kind||'').includes('duplicate')&&a<2)continue;throw e}\n    }\n    return{mode,keys:[raw],message:'KEY BOT BETA VITALÍCIO criada. Ela será vinculada ao primeiro PC que ativar.'};\n  }\n  if(mode==='beta'){\n    const plan=['daily','weekly','monthly'].includes(String(body.plan||''))?String(body.plan):'monthly';",
    'backend'
  );

  replace(
    "<option value=\"beta\" ${mode==='beta'?'selected':''}>KEY BOT BETA — EQUIPE RICO</option><option value=\"dashboard\"",
    "<option value=\"beta\" ${mode==='beta'?'selected':''}>KEY BOT BETA — 1 / 7 / 30 DIAS</option><option value=\"beta_lifetime\" ${mode==='beta_lifetime'?'selected':''}>KEY BOT BETA VITALÍCIO</option><option value=\"dashboard\"",
    'menu'
  );

  replace(
    "<option value=\"monthly\" selected>30 dias</option><option value=\"lifetime\">Vitalícia</option></select></div>\n<div id=\"accessFields\"",
    "<option value=\"monthly\" selected>30 dias</option></select></div>\n<div id=\"betaLifetimeFields\" class=\"hidden\"><div class=\"mode-note\"><b>BOT BETA VITALÍCIO</b><br>Gerador separado das keys de 1, 7 e 30 dias.</div><label>Cliente / observação</label><input name=\"betaLifetimeLabel\" maxlength=\"120\"></div>\n<div id=\"accessFields\"",
    'campos'
  );

  replace(
    "document.getElementById('betaFields').classList.toggle('hidden',m!=='beta');document.getElementById('accessFields')",
    "document.getElementById('betaFields').classList.toggle('hidden',m!=='beta');document.getElementById('betaLifetimeFields').classList.toggle('hidden',m!=='beta_lifetime');document.getElementById('accessFields')",
    'toggle'
  );

  replace(
    "      if(String(body.mode)==='beta'){normalized.plan=body.betaPlan||body.plan||'monthly';normalized.label=body.betaLabel||body.label||'';}\n      if(['dashboard','operacional'].includes(String(body.mode)))",
    "      if(String(body.mode)==='beta'){normalized.plan=body.betaPlan||body.plan||'monthly';normalized.label=body.betaLabel||body.label||'';}\n      if(String(body.mode)==='beta_lifetime'){normalized.plan='lifetime';normalized.label=body.betaLifetimeLabel||body.label||'';}\n      if(['dashboard','operacional'].includes(String(body.mode)))",
    'formulario'
  );

  code = code.replace(
    "modes:['prime','download','bot','beta','dashboard','operacional']",
    "modes:['prime','download','bot','beta','beta_lifetime','dashboard','operacional']"
  );

  return code;
};

require('./fix-token.cjs');
