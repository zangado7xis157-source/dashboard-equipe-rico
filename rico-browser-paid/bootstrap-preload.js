const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const base = __dirname;
const dir = path.join(base, 'private');
const apk = path.join(dir, 'RicoBrowserMobile.apk');
const zip = path.join(dir, 'RicoBrowserMobile.zip');
const source = process.env.APK_SOURCE_URL || '';
const min = 10 * 1024 * 1024;

function size(p) { try { return fs.statSync(p).size; } catch { return 0; } }

fs.mkdirSync(dir, { recursive: true });
if (size(apk) < min) {
  try { if (fs.existsSync(apk)) fs.unlinkSync(apk); } catch {}
  if (source) {
    try {
      console.log('Recuperando APK protegido...');
      execFileSync('curl', ['-fL', source, '-o', zip], { stdio: 'inherit' });
      if (size(zip) < 1024 * 1024) throw new Error('pacote baixado é pequeno demais');
      execFileSync('unzip', ['-o', zip, '-d', dir], { stdio: 'inherit' });
      const built = path.join(dir, 'RicoBrowserMobile-Android.apk');
      if (size(built) >= min) fs.renameSync(built, apk);
      if (size(apk) < min) throw new Error('APK válido não encontrado');
      console.log('APK protegido pronto:', size(apk), 'bytes');
    } catch (e) {
      console.error('APK protegido indisponível:', e.message);
      try { if (fs.existsSync(apk)) fs.unlinkSync(apk); } catch {}
    } finally {
      try { if (fs.existsSync(zip)) fs.unlinkSync(zip); } catch {}
    }
  } else {
    console.warn('APK_SOURCE_URL ainda não configurado; download protegido ficará bloqueado.');
  }
}
