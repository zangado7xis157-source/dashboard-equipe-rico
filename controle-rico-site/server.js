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
const BOT_FILENAME = 'CONTROLE_RICO_V52_INSTALADOR.vbs';
const EXPECTED_SHA256 = '3f9af308c409fd96dffdb9e93cad3145a0f5cee6fad6f267b3e5e842177b65bf';
const BOT_GZIP_B64 = 'H4sIAJny02oC/+2V3W7jNhCF7w34HQaCUUmIJSfppgFiGK3jOLsLbOLUdhqgRrCgpbHFliJVkvLPFvvuHdrJNkFd9LK5YC4cipr5eGZE8owqy5WE4aYSPOO22QhhoKTVSuCYZwp+OTuFj9JYJliuNIwWFMVEs3HFSzBFGyzTS7RtqEyzMUFLc9CDgUZmcTT/DTMbBQ+TTPPKppMChQjiZmOfQ3Hf3uz+XddC3LISmw1TpEO54lrJEiUR7sajwXAyCeIoGIw/k6TP0/74/XAaxATZ05qNytBD0BpqrXQ/c1XdaVygRplhL5xYVYVdmFC0TSYCsYLkhgvBDWZK5gbOj4+70Kq1ML2forCwtjIXnY5m63TJbVHPa4OaIi0JSjNVdr4wuaSWnG+4OTk7T4yqdYadnJlirpjOE/yj5hUmmprYyZ46untK6iqn7piDs52sqOXvprM6O00qJ/X4JLUbG7bfkKLTN6fo+zen6N2bU3S2UxTTHp/3bnGd7E8nTLbGYplOcUPH0Goul5c1FznqLiwUHeOsiFo1cLk/GvGf0FpnB/Jv0aYPOB8ITnV1wertLjL9gIxYZhbeU9lJf0lvw8de+HzFJO6OSehAJ/s7RqCmQ/oqcUASMHlKcLlSJZmbo8DZSvH8sTVP+1WFMo8il3ml1lIolu+rIfVH4Y+2Fx7NrqgvU17iaLEwaB8vLu5tdqvW6VTdS75xb15eCFEcx+lU85IG8BUWXJK8p6quuKmUwci9+Ep6l196M1K4Qu2w11qVl8zgD++eJcxpjadx7L5AyQ+08OMovcFS6S1FIiujNmFd8NIcDh6ostJoDF106ftfefWURvD27HDUi/GNypGkXlGt+7mdLPXfsp6/7dIQrtpOFS2oXDLt8B4NqdK+1mwbvW4ahX9rWpckvnpSLxvaBb6IHC39hHJpC0iEhZNj90e7zxZarSG8Y5myuDMnLl0JAq0KXfKM9F5z4Yp70NxiX4jLLZ2SqIVydfHKPdpulfjZE+60yqgPkLjsO0YLh2uztyfcYAhJXy9rZ0efuLEQhUEQHv2TeeTm42BnYeNaQlCpNW1j53wOA8mtooUWtAQkww1m9c6nFHnvFi63FXMCHrjM1XpitxT0gec5SqD9X5ZM5hAEAXxHZks/NAzacNyGayYMmeazmf5c/4uN879tPIFq30G193OakEyBpg+9YoAUB4LLgqUe5EEe5EEe5EEe5EEe5EEe5EEe5EEe5EEe5EEe5EEe5EEe5EEe5EEe5EEe5EEe5EEe5EEe5EEe5EH/L+gv+njZPOkuAAA=';

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
  const allowedOrigin = 'https://controle-rico-oficial.onrender.com';
  const origin = req.headers.origin;
  if (origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/', (_req, res) => {
  try {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace('<a href="#planos">Planos</a></nav>', '<a href="#planos">Planos</a><a href="#avaliacoes">Avaliações</a></nav>');
    html = html.replace('</main>', `${reviewSection}\n</main>`);
    html = html.replaceAll('CONTROLE_RICO_V36_REMOVER_EXTENSAO_CORRIGIDO.vbs', BOT_FILENAME);
    res.type('html').send(html);
  } catch (error) {
    console.error(error);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

function buildBotFile() {
  const gz = Buffer.from(BOT_GZIP_B64, 'base64');
  const file = zlib.gunzipSync(gz);
  const sha = crypto.createHash('sha256').update(file).digest('hex');
  if (sha !== EXPECTED_SHA256) throw new Error('Falha de integridade do arquivo.');
  return file;
}

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

app.get('/health', (_req, res) => res.json({ ok: true, service: 'controle-rico-site', version: '52.0.0' }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`Controle Rico site online na porta ${PORT} - V52`);
});
