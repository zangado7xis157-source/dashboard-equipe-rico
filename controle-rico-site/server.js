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

const reviewSection = `
<section class="wrap" id="avaliacoes" style="padding:10px 0 78px">
  <div style="text-align:center;margin-bottom:28px">
    <span class="eyebrow">avaliações</span>
    <h2 style="font-size:39px;margin:12px 0 8px">O que dizem sobre o Controle Rico</h2>
    <p style="color:#a7a7af;max-width:760px;margin:0 auto;line-height:1.6">Exemplos ilustrativos de avaliações. Substitua por feedbacks reais de clientes conforme forem chegando.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:14px">
    ${[
      ['Usuário 01','Interface bem organizada e simples de entender. Ficou muito mais fácil separar e abrir meus perfis.'],
      ['Usuário 02','Gostei bastante da parte de proxy por perfil e da verificação antes de abrir. Deixa o fluxo bem mais organizado.'],
      ['Usuário 03','O painel é rápido e direto. As extensões automáticas ajudam bastante no dia a dia.'],
      ['Usuário 04','A organização dos perfis ficou muito melhor. O visual escuro também ficou bonito e confortável de usar.'],
      ['Usuário 05','A parte de Speed e gerenciamento centralizado deixou minhas tarefas mais práticas.'],
      ['Usuário 06','Gostei de conseguir deixar cada perfil separado e manter as configurações salvas.'],
      ['Usuário 07','O teste de proxy antes de abrir o perfil é um detalhe que ajuda bastante.'],
      ['Usuário 08','Bem mais fácil trabalhar com vários perfis sem ficar perdido entre janelas e configurações.'],
      ['Usuário 09','A instalação foi simples e o sistema de key deixou o acesso bem organizado.'],
      ['Usuário 10','Ferramenta bonita, rápida e com tudo centralizado em um só lugar.']
    ].map(([name,text]) => `<article style="position:relative;background:linear-gradient(#121216,#09090c);border:1px solid #342126;border-radius:16px;padding:20px;box-shadow:0 12px 30px #0007"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:12px"><b style="font-size:14px">${name}</b><span style="font-size:10px;font-weight:900;color:#ff7380;border:1px solid #65141d;background:#16070a;padding:4px 7px;border-radius:999px">EXEMPLO</span></div><div style="color:#ff2a3d;letter-spacing:2px;margin-bottom:11px">★★★★★</div><p style="margin:0;color:#c7c7cd;line-height:1.55;font-size:14px">“${text}”</p></article>`).join('')}
  </div>
</section>`;

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

app.get('/', (_req, res) => {
  try {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace('<a href="#planos">Planos</a></nav>', '<a href="#planos">Planos</a><a href="#avaliacoes">Avaliações</a></nav>');
    html = html.replace('</main>', `${reviewSection}\n</main>`);
    res.type('html').send(html);
  } catch (error) {
    console.error(error);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

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
