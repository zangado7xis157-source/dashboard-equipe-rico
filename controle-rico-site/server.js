import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = 'https://ytjwwgskilygayjrycfk.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0and3Z3NraWx5Z2F5anJ5Y2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NzM4NTUsImV4cCI6MjEwNjU0OTg1NX0.avTRZstKk41cVH9oQAqXxdPVw8Q6jv9ARXabuK_4HrM';
const DOWNLOAD_EDGE_TOKEN = process.env.DOWNLOAD_EDGE_TOKEN || '';
const BOT_FILE_KEY = process.env.BOT_FILE_KEY || '';
const EXPECTED_SHA256 = '5a16d8d072db5673a0b6add5a1fe773e61058cb3fa9b38547e0bd2c99afb9b5f';
const BOT_FILENAME = 'CONTROLE_RICO_V36_REMOVER_EXTENSAO_CORRIGIDO.vbs';

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

function buildBotFile() {
  const encoded = [0, 1, 2, 3]
    .map((i) => fs.readFileSync(path.join(__dirname, 'secure', `bot${i}.txt`), 'utf8').trim())
    .join('');
  const payload = Buffer.from(encoded, 'base64');
  if (payload.length < 29) throw new Error('Pacote do bot invalido.');

  const nonce = payload.subarray(0, 12);
  const encryptedAndTag = payload.subarray(12);
  const tag = encryptedAndTag.subarray(encryptedAndTag.length - 16);
  const ciphertext = encryptedAndTag.subarray(0, encryptedAndTag.length - 16);
  const key = Buffer.from(BOT_FILE_KEY, 'base64');
  if (key.length !== 32) throw new Error('Servidor de download nao configurado.');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAAD(Buffer.from('controle-rico-v36-gzip'));
  decipher.setAuthTag(tag);
  const gz = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const file = zlib.gunzipSync(gz);
  const sha = crypto.createHash('sha256').update(file).digest('hex');
  if (sha !== EXPECTED_SHA256) throw new Error('Falha de integridade do arquivo.');
  return file;
}

app.post('/api/download', async (req, res) => {
  try {
    if (!DOWNLOAD_EDGE_TOKEN || !BOT_FILE_KEY) {
      return res.status(503).json({ ok: false, message: 'Servidor de download ainda nao foi configurado.' });
    }

    const rawKey = String(req.body?.key || '').trim().toUpperCase();
    if (!/^DOWNLOAD-RICO-[A-Z0-9-]{15,40}$/.test(rawKey)) {
      return res.status(400).json({ ok: false, message: 'Key invalida.' });
    }

    const botFile = buildBotFile();
    const keyHash = crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');

    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_controle_rico_download_key`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_edge_token: DOWNLOAD_EDGE_TOKEN,
        p_key_hash: keyHash
      })
    });

    if (!rpc.ok) {
      return res.status(502).json({ ok: false, message: 'Nao foi possivel validar a key agora.' });
    }

    const result = await rpc.json();
    if (!result?.ok) {
      return res.status(403).json({ ok: false, message: 'Key invalida ou ja utilizada.' });
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${BOT_FILENAME}"`);
    return res.send(botFile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: 'Erro interno ao liberar o download.' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true, service: 'controle-rico-site' }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`Controle Rico site online na porta ${PORT}`);
});
