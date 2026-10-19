const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const dir = __dirname;
const sourcePath = path.join(dir, 'server.js');
const runtimePath = path.join(dir, '.server-mobile-input-fix.mjs');

let source = fs.readFileSync(sourcePath, 'utf8');

const originalReturn = '  return patchBotShortKeys(raw);';
const patchedReturn = `  let releaseText = raw.toString('utf16le');

  const mustReplaceAll = (from, to, label) => {
    if (!releaseText.includes(from)) {
      throw new Error(\`Patch V52 nao encontrou: \${label}\`);
    }
    releaseText = releaseText.split(from).join(to);
  };

  mustReplaceAll(
    'f.WriteLine "        WindowSize = \\\'\\\'"',
    'f.WriteLine "        WindowSize = \\\'1500,3000\\\'"',
    'resolucao padrao'
  );
  mustReplaceAll(
    'f.WriteLine "            $cfg.WindowSize = \\\'412,915\\\'"',
    'f.WriteLine "            $cfg.WindowSize = \\\'1500,3000\\\'"',
    'resolucao Android/App'
  );
  mustReplaceAll(
    'f.WriteLine "            $cfg.WindowSize = \\\'390,844\\\'"',
    'f.WriteLine "            $cfg.WindowSize = \\\'1500,3000\\\'"',
    'resolucao iPhone'
  );
  mustReplaceAll(
    'f.WriteLine "            $cfg.Touch = $true"',
    'f.WriteLine "            $cfg.Touch = $false"',
    'entrada mobile por mouse/teclado'
  );
  mustReplaceAll(
    'f.WriteLine "        $device.WindowSize = \\\'430,850\\\'"',
    'f.WriteLine "        $device.WindowSize = \\\'1500,3000\\\'"',
    'resolucao portrait'
  );
  mustReplaceAll(
    'f.WriteLine "        $device.Touch = $true"',
    'f.WriteLine "        $device.Touch = $false"',
    'touch portrait'
  );

  const eol = releaseText.includes('\\r\\n') ? '\\r\\n' : '\\n';
  const launchAnchor = 'f.WriteLine "    $device = Get-DeviceLaunchConfig $profile"';
  if (!releaseText.includes(launchAnchor)) {
    throw new Error('Patch V52 nao encontrou ponto de resolucao do perfil.');
  }
  releaseText = releaseText.replace(
    launchAnchor,
    [
      launchAnchor,
      'f.WriteLine "    # Resolucao padrao solicitada: todas as telas abrem em 1500x3000."',
      'f.WriteLine "    $device.WindowSize = \\\'1500,3000\\\'"'
    ].join(eol)
  );

  const touchBlock = [
    'f.WriteLine "    if ($device.Touch) {"',
    'f.WriteLine "        $args += \\\'--touch-events=enabled\\\'"',
    'f.WriteLine "    }"'
  ].join(eol);
  const desktopInputBlock = [
    'f.WriteLine "    if ($device.Touch) {"',
    'f.WriteLine "        $args += \\\'--touch-events=enabled\\\'"',
    'f.WriteLine "    } else {"',
    'f.WriteLine "        # Mantem visual/UA mobile, mas usa mouse, rodinha e teclado do PC."',
    'f.WriteLine "        $args += \\\'--touch-events=disabled\\\'"',
    'f.WriteLine "    }"'
  ].join(eol);
  if (!releaseText.includes(touchBlock)) {
    throw new Error('Patch V52 nao encontrou bloco touch-events.');
  }
  releaseText = releaseText.replace(touchBlock, desktopInputBlock);

  const updaterAnchor = 'f.WriteLine "# ===== FIM LICENCIAMENTO ====="';
  if (!releaseText.includes(updaterAnchor)) {
    throw new Error('Patch V52 nao encontrou ponto do aviso de atualizacao.');
  }
  const updaterLines = [
    updaterAnchor,
    'f.WriteLine ""',
    'f.WriteLine "# ===== AVISO DE ATUALIZACAO ====="',
    'f.WriteLine "$script:controleRicoVersion = \\\'52.0.9\\\'"',
    'f.WriteLine "$script:updateBaseUrl = \\\'https://controle-rico.onrender.com\\\'"',
    'f.WriteLine "function Show-ControleRicoUpdateNotice {"',
    'f.WriteLine "    try {"',
    'f.WriteLine "        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12"',
    'f.WriteLine "        $info = Invoke-RestMethod -Uri ($script:updateBaseUrl + \\\'/api/update-info\\\') -Method Get -TimeoutSec 8"',
    'f.WriteLine "        if (-not $info -or -not $info.ok -or -not $info.version) { return }"',
    'f.WriteLine "        if ([version]([string]$info.version) -le [version]$script:controleRicoVersion) { return }"',
    'f.WriteLine "        $nl = [Environment]::NewLine"',
    'f.WriteLine "        $notes = [string]$info.notes"',
    'f.WriteLine "        $message = \\\'Nova atualização disponível - V\\\' + [string]$info.version + $nl + $nl + $notes + $nl + $nl + \\\'Deseja abrir o site para atualizar agora?\\\'"',
    'f.WriteLine "        $choice = [System.Windows.Forms.MessageBox]::Show($message,\\\'Controle Rico - Atualização\\\',[System.Windows.Forms.MessageBoxButtons]::YesNo,[System.Windows.Forms.MessageBoxIcon]::Information)"',
    'f.WriteLine "        if ($choice -eq [System.Windows.Forms.DialogResult]::Yes) { Start-Process $script:updateBaseUrl }"',
    'f.WriteLine "    } catch {}"',
    'f.WriteLine "}"',
    'f.WriteLine "Show-ControleRicoUpdateNotice"',
    'f.WriteLine "# ===== FIM AVISO DE ATUALIZACAO ====="'
  ].join(eol);
  releaseText = releaseText.replace(updaterAnchor, updaterLines);

  const releaseRaw = Buffer.from(releaseText, 'utf16le');
  return patchBotShortKeys(releaseRaw);`;

if (!source.includes(originalReturn)) {
  throw new Error('Ponto de patch do V52 nao encontrado no servidor.');
}
source = source.replace(originalReturn, patchedReturn);


const updateRouteAnchor = "\napp.get('/health', (_req, res) => {";
if (!source.includes(updateRouteAnchor)) {
  throw new Error('Ponto da rota de atualizacao nao encontrado.');
}
const updateRoute = `
app.get('/api/update-info', (_req, res) => {
  try {
    const updateFile = buildBotFile();
    const updateSha = crypto.createHash('sha256').update(updateFile).digest('hex');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      version: '52.0.9',
      notes: 'Há uma nova versão do Controle Rico. Abra o site oficial, baixe a atualização e instale por cima da versão atual. Seus perfis continuam salvos.',
      sha256: updateSha,
      bytes: updateFile.length
    });
  } catch (error) {
    console.error('Update info V52:', error);
    return res.status(503).json({ ok: false, version: '52.0.9' });
  }
});
`;
source = source.replace(updateRouteAnchor, `${updateRoute}${updateRouteAnchor}`);

source = source.replace(
  '      shortBotKeys: true,',
  '      shortBotKeys: true,\n      mobileInputFix: true,\n      resolution1500x3000: true,\n      updateNotice: true,'
);
source = source.replaceAll(
  "version: '52.0.6'",
  "version: '52.0.9'"
);
source = source.replace(
  "downloadPackage: 'V52_SLIM_ICON_VALIDATED_SHORT_KEYS'",
  "downloadPackage: 'V52_1500x3000_MOBILE_INPUT_UPDATE_NOTICE'"
);
source = source.replace(
  'V52.0.6 short BOT keys',
  'V52.0.9 short BOT keys + mobile input + 1500x3000 + update notice'
);

const listenAnchor = '\napp.listen(PORT, () => {';
if (!source.includes(listenAnchor)) {
  throw new Error('Ponto de preflight do V52 nao encontrado no servidor.');
}
source = source.replace(
  listenAnchor,
  `\nconst releasePreflight = buildBotFile();\nconsole.log(\`V52.0.9 preflight OK - \${releasePreflight.length} bytes\`);\n${listenAnchor}`
);

fs.writeFileSync(runtimePath, source, 'utf8');

import(pathToFileURL(runtimePath).href).catch((error) => {
  console.error('Falha ao iniciar Controle Rico V52.0.9:', error);
  process.exit(1);
});
