const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let source = fs.readFileSync(serverPath, 'utf8');

// Permite que o site público do BOT BETA use as rotas de download/ativação.
const corsOld = "    'https://controle-rico.onrender.com',\n    'https://controle-rico-oficial.onrender.com'\n  ]);";
const corsNew = "    'https://controle-rico.onrender.com',\n    'https://controle-rico-oficial.onrender.com',\n    'https://bot-beta-cz15.onrender.com'\n  ]);";
if (!source.includes(corsOld)) {
  throw new Error('Bloco CORS do Controle Rico não encontrado.');
}
source = source.replace(corsOld, corsNew);

// O V52 passa a aceitar tanto as keys BOT-RICO antigas quanto as novas BOT-BETA-RICO.
const oldShortKeyLine = `    'f.WriteLine "        if ($short -match \\'^BOT-RICO(?:-[A-Z0-9]{4}){4}$\\') {"',`;
const safeShortKeyLine = `    'f.WriteLine "        if (($short.StartsWith(""BOT-RICO-"") -and $short.Length -eq 28) -or ($short.StartsWith(""BOT-BETA-RICO-"") -and $short.Length -eq 33)) {"',`;
if (!source.includes(oldShortKeyLine)) {
  throw new Error('Linha BOT-RICO nao encontrada para correcao VBS.');
}
source = source.replace(oldShortKeyLine, safeShortKeyLine);

// Seleciona automaticamente o endpoint correto conforme o prefixo da key.
const oldActivate = `    'f.WriteLine "                $r = Invoke-RestMethod -Uri \\'https://controle-rico.onrender.com/api/activate-bot\\' -Method Post -ContentType \\'application/json\\' -Body $body -TimeoutSec 12"',`;
const newActivate = [
  `    'f.WriteLine "                $activateUrl = if ($short.StartsWith(""BOT-BETA-RICO-"")) { \\'https://controle-rico.onrender.com/api/activate-beta\\' } else { \\'https://controle-rico.onrender.com/api/activate-bot\\' }"',`,
  `    'f.WriteLine "                $r = Invoke-RestMethod -Uri $activateUrl -Method Post -ContentType \\'application/json\\' -Body $body -TimeoutSec 12"',`
].join('\n');
if (!source.includes(oldActivate)) {
  throw new Error('Linha de ativacao BOT não encontrada.');
}
source = source.replace(oldActivate, newActivate);

// Lifetime do BOT BETA não possui expires_at; trata isso sem tentar converter data vazia.
const oldExpiry = [
  `    'f.WriteLine "                    $expires = [DateTimeOffset]::Parse([string]$r.expires_at).ToLocalTime().DateTime"',`,
  `    'f.WriteLine "                    return [pscustomobject]@{Valid=$true;Message=(\\'Ativo até {0:dd/MM/yyyy HH:mm}\\' -f $expires);Plan=[string]$r.plan;Expires=$expires}"',`
].join('\n');
const newExpiry = [
  `    'f.WriteLine "                    if ([string]::IsNullOrWhiteSpace([string]$r.expires_at)) {"',`,
  `    'f.WriteLine "                        return [pscustomobject]@{Valid=$true;Message=\\'Acesso vitalício\\';Plan=[string]$r.plan;Expires=$null}"',`,
  `    'f.WriteLine "                    }"',`,
  `    'f.WriteLine "                    $expires = [DateTimeOffset]::Parse([string]$r.expires_at).ToLocalTime().DateTime"',`,
  `    'f.WriteLine "                    return [pscustomobject]@{Valid=$true;Message=(\\'Ativo até {0:dd/MM/yyyy HH:mm}\\' -f $expires);Plan=[string]$r.plan;Expires=$expires}"',`
].join('\n');
if (!source.includes(oldExpiry)) {
  throw new Error('Bloco de validade BOT não encontrado.');
}
source = source.replace(oldExpiry, newExpiry);

// Endpoint para validar BOT-BETA-RICO e vincular a key ao primeiro PC que ativar.
const downloadAnchor = "\napp.post('/api/download', async (req, res) => {";
if (!source.includes(downloadAnchor)) {
  throw new Error('Ponto da rota de download não encontrado.');
}
const betaRoute = String.raw`
app.post('/api/activate-beta', async (req, res) => {
  try {
    const rawKey = String(req.body?.key || '').trim().toUpperCase();
    const deviceId = String(req.body?.deviceId || '').trim().toUpperCase();
    if (!/^BOT-BETA-RICO(?:-[A-Z0-9]{4}){4}$/.test(rawKey) || deviceId.length < 8 || deviceId.length > 100) {
      return res.status(200).json({ ok: false, message: 'invalid_key' });
    }
    const keyHash = crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
    const rpc = await fetch(\`\${SUPABASE_URL}/rest/v1/rpc/activate_equipe_rico_beta_key\`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON, Authorization: \`Bearer \${SUPABASE_ANON}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_key_hash: keyHash, p_device_id: deviceId })
    });
    if (!rpc.ok) {
      console.error('RPC beta key:', rpc.status, await rpc.text());
      return res.status(502).json({ ok: false, message: 'validation_unavailable' });
    }
    const result = await rpc.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result || { ok: false, message: 'invalid_key' });
  } catch (error) {
    console.error('Erro ao validar BOT BETA key:', error);
    return res.status(500).json({ ok: false, message: 'validation_unavailable' });
  }
});
`;
source = source.replace(downloadAnchor, `${betaRoute}${downloadAnchor}`);

fs.writeFileSync(serverPath, source, 'utf8');

require('./bootstrap-mobile-input-fix.cjs');
