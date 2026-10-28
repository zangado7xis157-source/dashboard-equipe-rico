const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const APK_PATH = path.join(__dirname, 'private', 'RicoBrowserMobile.apk');
const ZIP_PATH = path.join(__dirname, 'private', 'RicoBrowserMobile.zip');
const MIN_BYTES = 10 * 1024 * 1024;
const SOURCE = process.env.APK_SOURCE_URL || '';

function validApk() {
  try { return fs.statSync(APK_PATH).size >= MIN_BYTES; } catch { return false; }
}

async function ensureApk() {
  fs.mkdirSync(path.dirname(APK_PATH), { recursive: true });
  if (validApk()) {
    console.log('APK protegido OK:', fs.statSync(APK_PATH).size, 'bytes');
    return;
  }

  try { if (fs.existsSync(APK_PATH)) fs.unlinkSync(APK_PATH); } catch {}

  if (!SOURCE) {
    console.warn('APK_SOURCE_URL não configurado; download ficará indisponível.');
    return;
  }

  console.log('Baixando pacote protegido do APK...');
  try {
    const r = await fetch(SOURCE, { redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1024 * 1024) throw new Error(`pacote pequeno demais: ${buf.length} bytes`);
    fs.writeFileSync(ZIP_PATH, buf);
    execFileSync('unzip', ['-o', ZIP_PATH, '-d', path.dirname(APK_PATH)], { stdio: 'inherit' });

    const candidates = [
      path.join(path.dirname(APK_PATH), 'RicoBrowserMobile-Android.apk'),
      APK_PATH
    ];
    const found = candidates.find(p => {
      try { return fs.statSync(p).size >= MIN_BYTES; } catch { return false; }
    });
    if (!found) throw new Error('APK válido não encontrado no pacote');
    if (found !== APK_PATH) fs.renameSync(found, APK_PATH);
    if (!validApk()) throw new Error('APK final inválido');
    console.log('APK protegido carregado:', fs.statSync(APK_PATH).size, 'bytes');
  } catch (e) {
    console.error('Falha ao carregar APK protegido:', e.message);
    try { if (fs.existsSync(APK_PATH)) fs.unlinkSync(APK_PATH); } catch {}
  } finally {
    try { if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH); } catch {}
  }
}

ensureApk().finally(() => require('./server.js'));
