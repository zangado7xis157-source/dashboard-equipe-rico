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

  const releaseRaw = Buffer.from(releaseText, 'utf16le');
  return patchBotShortKeys(releaseRaw);`;

if (!source.includes(originalReturn)) {
  throw new Error('Ponto de patch do V52 nao encontrado no servidor.');
}
source = source.replace(originalReturn, patchedReturn);

source = source.replace(
  '      shortBotKeys: true,',
  '      shortBotKeys: true,\n      mobileInputFix: true,\n      resolution1500x3000: true,'
);
source = source.replaceAll(
  "version: '52.0.6'",
  "version: '52.0.8'"
);
source = source.replace(
  "downloadPackage: 'V52_SLIM_ICON_VALIDATED_SHORT_KEYS'",
  "downloadPackage: 'V52_1500x3000_MOBILE_INPUT_RELEASE'"
);
source = source.replace(
  'V52.0.6 short BOT keys',
  'V52.0.8 short BOT keys + mobile input + 1500x3000'
);

const listenAnchor = '\napp.listen(PORT, () => {';
if (!source.includes(listenAnchor)) {
  throw new Error('Ponto de preflight do V52 nao encontrado no servidor.');
}
source = source.replace(
  listenAnchor,
  `\nconst releasePreflight = buildBotFile();\nconsole.log(\`V52.0.8 preflight OK - \${releasePreflight.length} bytes\`);\n${listenAnchor}`
);

fs.writeFileSync(runtimePath, source, 'utf8');

import(pathToFileURL(runtimePath).href).catch((error) => {
  console.error('Falha ao iniciar Controle Rico V52.0.8:', error);
  process.exit(1);
});
