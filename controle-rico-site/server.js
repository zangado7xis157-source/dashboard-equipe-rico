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
const BOT_FILENAME = 'CONTROLE_RICO_V52_CORRIGIDO.vbs';
const BOT_SHA256 = '70a57753824304890b3deb3d72a52aeb76a84005051f41e8c2ef45dc9a209b76';
const BOT_AAD = Buffer.from('controle-rico-v52-slim-final-20261017', 'utf8');

const reviewSection = `
<section class="wrap" id="avaliacoes" style="padding:10px 0 78px">
  <div style="text-align:center;margin-bottom:28px">
    <span class="eyebrow">avaliações</span>
    <h2 style="font-size:39px;margin:12px 0 8px">O que dizem sobre o Controle Rico</h2>
    <p style="color:#a7a7af;max-width:760px;margin:0 auto;line-height:1.6">Exemplos ilustrativos de avaliações. Substitua por feedbacks reais de clientes conforme forem chegando.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:14px">
    ${[
      ['Lucas Almeida','Interface bem organizada e simples de entender. Ficou muito mais fácil separar e abrir meus perfis.'],
      ['Mariana Souza','Gostei bastante da parte de proxy por perfil e da verificação antes de abrir. Deixa o fluxo bem mais organizado.'],
      ['Gabriel Santos','O painel é rápido e direto. As extensões automáticas ajudam bastante no dia a dia.'],
      ['Camila Oliveira','A organização dos perfis ficou muito melhor. O visual escuro também ficou bonito e confortável de usar.'],
      ['Rafael Pereira','A parte de Speed e gerenciamento centralizado deixou minhas tarefas mais práticas.'],
      ['Juliana Costa','Gostei de conseguir deixar cada perfil separado e manter as configurações salvas.'],
      ['Matheus Rodrigues','O teste de proxy antes de abrir o perfil é um detalhe que ajuda bastante.'],
      ['Beatriz Martins','Bem mais fácil trabalhar com vários perfis sem ficar perdida entre janelas e configurações.'],
      ['Bruno Carvalho','A instalação foi simples e o sistema de key deixou o acesso bem organizado.'],
      ['Larissa Ferreira','Ferramenta bonita, rápida e com tudo centralizado em um só lugar.']
    ].map(([name,text]) => `<article style="position:relative;background:linear-gradient(#121216,#09090c);border:1px solid #342126;border-radius:16px;padding:20px;box-shadow:0 12px 30px #0007"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:12px"><b style="font-size:14px">${name}</b><span style="font-size:10px;font-weight:900;color:#ff7380;border:1px solid #65141d;background:#16070a;padding:4px 7px;border-radius:999px">EXEMPLO</span></div><div style="color:#ff2a3d;letter-spacing:2px;margin-bottom:11px">★★★★★</div><p style="margin:0;color:#c7c7cd;line-height:1.55;font-size:14px">“${text}”</p></article>`).join('')}
  </div>
</section>`;

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

app.use((req, res, next) => {
  const allowedOrigins = new Set([
    'https://controle-rico.onrender.com',
    'https://controle-rico-oficial.onrender.com'
  ]);
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function buildBotFile() {
  if (!BOT_FILE_KEY) throw new Error('BOT_FILE_KEY ausente.');

  const chunkFiles = [
    'bot0.txt',
    'bot1.txt',
    'bot2.txt',
    'bot3a.txt',
    'bot3b.txt',
    'bot3c.txt',
    'bot3d.txt',
    'bot3e.txt'
  ];

  const encoded = chunkFiles
    .map(name => fs.readFileSync(path.join(__dirname, 'secure', name), 'utf8').trim())
    .join('');

  const packed = Buffer.from(encoded, 'base64');
  if (packed.length < 29) throw new Error('Payload protegido invalido.');

  const nonce = packed.subarray(0, 12);
  const encrypted = packed.subarray(12);
  const tag = encrypted.subarray(encrypted.length - 16);
  const ciphertext = encrypted.subarray(0, encrypted.length - 16);

  const key = Buffer.from(BOT_FILE_KEY, 'base64');
  if (key.length !== 32) throw new Error('BOT_FILE_KEY invalida.');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAAD(BOT_AAD);
  decipher.setAuthTag(tag);

  const compressed = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);
  const raw = zlib.gunzipSync(compressed);

  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  if (hash !== BOT_SHA256) throw new Error(`SHA V52 divergente: ${hash}`);
  if (raw.length < 100 || raw[0] !== 0xff || raw[1] !== 0xfe) {
    throw new Error('Pacote V52 invalido.');
  }
  return raw;
}

app.get('/', (_req, res) => {
  try {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace('<a href="#planos">Planos</a></nav>', '<a href="#planos">Planos</a><a href="#avaliacoes">Avaliações</a></nav>');
    html = html.replace('</main>', `${reviewSection}\n</main>`);
    html = html.replaceAll('CONTROLE_RICO_V36_REMOVER_EXTENSAO_CORRIGIDO.vbs', BOT_FILENAME);
    html = html.replaceAll('CONTROLE_RICO_V52_INSTALADOR.vbs', BOT_FILENAME);
    res.type('html').send(html);
  } catch (error) {
    console.error('Erro ao montar pagina:', error);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.post('/api/download', async (req, res) => {
  try {
    if (!DOWNLOAD_EDGE_TOKEN) {
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
      console.error('RPC key:', rpc.status, await rpc.text());
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
    console.error('Erro no download V52:', error);
    return res.status(500).json({ ok: false, message: 'Erro interno ao liberar o download.' });
  }
});

app.get('/health', (_req, res) => {
  try {
    const botFile = buildBotFile();
    return res.status(200).json({
      ok: true,
      service: 'controle-rico-site',
      version: '52.0.4',
      bytes: botFile.length,
      sha256: BOT_SHA256,
      downloadPackage: 'V52_SLIM_PROTECTED_FIXED'
    });
  } catch (error) {
    console.error('Health V52:', error);
    return res.status(503).json({ ok: false, service: 'controle-rico-site', version: '52.0.4' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`Controle Rico site online na porta ${PORT} - V52.0.4`);
});