const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const dir = __dirname;
const sourcePath = path.join(dir, 'server.js');
const runtimePath = path.join(dir, '.server-mobile-input-fix.mjs');

let source = fs.readFileSync(sourcePath, 'utf8');

const originalReturn = '  return patchBotShortKeys(raw);';
const patchedReturn = `  const mobileInputText = raw.toString('utf16le');\n  if (!mobileInputText.includes('--touch-events=enabled')) {\n    throw new Error('Flag touch-events do V52 nao encontrada para aplicar correcao de mouse/teclado.');\n  }\n  const mobileInputRaw = Buffer.from(\n    mobileInputText.replaceAll('--touch-events=enabled', '--touch-events=auto'),\n    'utf16le'\n  );\n  return patchBotShortKeys(mobileInputRaw);`;

if (!source.includes(originalReturn)) {
  throw new Error('Ponto de patch do V52 nao encontrado no servidor.');
}
source = source.replace(originalReturn, patchedReturn);

source = source.replace(
  '      shortBotKeys: true,',
  '      shortBotKeys: true,\n      mobileInputFix: true,'
);
source = source.replace(
  "version: '52.0.6',",
  "version: '52.0.7',"
);
source = source.replace(
  'V52.0.6 short BOT keys',
  'V52.0.7 short BOT keys + Android/iOS mouse input fix'
);

fs.writeFileSync(runtimePath, source, 'utf8');

import(pathToFileURL(runtimePath).href).catch((error) => {
  console.error('Falha ao iniciar Controle Rico com correcao mobile:', error);
  process.exit(1);
});
