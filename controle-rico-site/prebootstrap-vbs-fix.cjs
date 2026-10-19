const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let source = fs.readFileSync(serverPath, 'utf8');

const oldShortKeyLine = `    'f.WriteLine "        if ($short -match \\'^BOT-RICO(?:-[A-Z0-9]{4}){4}$\\') {"',`;
const safeShortKeyLine = `    'f.WriteLine "        if ($short.StartsWith(""BOT-RICO-"") -and $short.Length -eq 28) {"',`;

if (!source.includes(oldShortKeyLine)) {
  throw new Error('Linha BOT-RICO nao encontrada para correcao VBS.');
}

source = source.replace(oldShortKeyLine, safeShortKeyLine);
fs.writeFileSync(serverPath, source, 'utf8');

require('./bootstrap-mobile-input-fix.cjs');
