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
const BOT_FILENAME = 'CONTROLE_RICO_V52_CORRIGIDO.vbs';

// Payload do hotfix V52 embutido no backend. Isso elimina a dependencia do
// raw.githubusercontent.com durante a liberacao do download e evita Z_DATA_ERROR.
const HOTFIX_PAYLOAD_B64 = 'H4sIAJ7202oC/+3W8W/aRhTA8d8j5X84oWgYFZtAS9olQhpNSDupTbKQLtKiqjL2AbcZn3c+B+jU/33PEKpWjdRf1+nLD4nB93nv3XG+x2Xhjc3VaFVkJjF+f6+pTm3unc20ujaJVb/3e2pu/dSsVKpVYlMzNUmcxHZ/78wsVDlvKx+7mfZtVZT7e2Pt5TM1UKdOx15fTv7UiQ8at+PEmcJH47nOskZrf29rZNznO5t/51WWXcQLvb9XzqNRfm+czRc6lwhX15eno/G40Qoap9cfpKoPN8PrV6ObRkuCbKPt7xWlvGkcjJyzbpjUM7tyeqqdzhM9aI69LZonaiyjfTjOtC5U+NZkmSl1YvO0VP3DwxN1ULmsHPwSNOfeF+Vxp+PiZTQzfl5NqlI7GemloCixi87HOJ/FqX2+MmW3/zwsbeUS3Unjcj6xsUtD/XdlCh06WcdOMn1xNO11p904Per+PI318xe9bnrYS6Zpt/csPXr6Qncnh/1uJ3lY/g0LqyKVZewk8yr/q+zc93thUVd/2I38yjfb/+0iez9CkU9/hCKf/QhF9jdFtuQRmgwu9DLcPvxqvC69XkQ3eiVPuXcmn72sTJZqd6KmVk6JZB4cVMrk2yev9Y86WCaP+Avto1s9Oc2MTPVEebfejIxe61hilXfNd7IS4XAmd5vvB83dKRbWp1go50X4enOKyQFwd29N+v5gEg2LQudpENRhzuwyz2ycbiuUilqt6MaZRdBqqU9qavI4yx4ynpmysKUO6hufZLazj4M7SXevnX9/fHzu7OJlXOqjZ7tQk+jGPly36tVZmEem9+tl9FYvrFvLSB0vgraErQfPyscHn9pF4XRZyhkXvfrDFA9MgrfvHh/1xfVbm2op9UzOve1nm7Ls98varfuslHDF+sZKQltj2ZADuZSZDp2L18HXiybDPy/aiZT41Tv75YKeKDMN6mjRG53P/FyFmVfdw/olO8PPnV2q5lWcWK83rck6M6vTyP6p55Jpb5ubL0W24uBus+dGed218plM+JX2u3dBt9fvtSL5ZPc1SVKZyZ3M+Nxk9fLcOuP1MMvqKMGBzu+Pv+o87TpH+5sc73LZcKlu7RrNlbOJrLAK66hXsUypuSy3PU+vdFOFQzer6h73xpReBc2GvJpPvk33ZHun1dj0xusqV43CLmXn1y21DqXCCyvJppJGhaOVTqpNA7TS2Nfq5bqI6yJuTZ7a5divZdBrk6Y6V6FsjEWcp0rCq5+ki8ufOlVbHbbVeZyV0o13Xfq36ju/ESR9YuTrCFUeW+Vk69zHSpc+VpnJ53EEBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBj8/8L/ArUpB9vO1AEA';

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
    console.error(error);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

function toUtf16LeWithBom(text) {
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
}

function buildBotFile() {
  const compressed = Buffer.from(HOTFIX_PAYLOAD_B64, 'base64');
  let raw = zlib.gunzipSync(compressed);
  if (raw.length < 100) throw new Error('Pacote V52 inválido.');

  const hasUtf16LeBom = raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xfe;
  const hasUtf16BeBom = raw.length >= 2 && raw[0] === 0xfe && raw[1] === 0xff;
  if (hasUtf16LeBom || hasUtf16BeBom) return raw;

  let text = raw.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return toUtf16LeWithBom(text);
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

    // Monta e valida o arquivo ANTES de consumir a key. Assim uma falha do
    // servidor nunca gasta a key do cliente.
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
      console.error('Falha RPC download key:', rpc.status, await rpc.text());
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
      ok: botFile.length > 100,
      service: 'controle-rico-site',
      version: '52.0.2',
      downloadPackage: 'V52_CORRIGIDO_EMBUTIDO'
    });
  } catch (error) {
    console.error('Health V52:', error);
    return res.status(503).json({ ok: false, service: 'controle-rico-site', version: '52.0.2' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`Controle Rico site online na porta ${PORT} - V52.0.2 corrigida`);
});
