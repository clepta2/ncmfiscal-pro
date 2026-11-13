/**
 * worker.js
 * Cloudflare Worker Anycast para NCM Fiscal Pro API (diffstore264.workers.dev)
 * 
 * @license MIT
 * @see https://github.com/clepta2/ncmfiscal-pro
 */

import { NcmFiscalPro } from './ncmfiscal-pro.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Access-Control-Max-Age': '86400'
};

const ipBuckets = new Map();

function checkRateLimit(ip, limit = 60, windowMs = 60000) {
  const now = Date.now();
  let entry = ipBuckets.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    ipBuckets.set(ip, entry);
    if (ipBuckets.size > 10000) {
      for (const [k, v] of ipBuckets) {
        if (now > v.resetAt) ipBuckets.delete(k);
      }
    }
    return { ok: true, remaining: limit - 1, resetAt: entry.resetAt };
  }
  entry.count++;
  if (entry.count > limit) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { ok: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';
    const wantsJson = url.searchParams.get('format') === 'json' ||
      (request.headers.get('Accept') && request.headers.get('Accept').includes('application/json'));

    // 1. Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 2. Blindagem de Métodos HTTP
    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Método não permitido. Esta API opera estritamente com consultas GET e POST.'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
      });
    }

    // 3. Autenticação e Rate Limit
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-real-ip') || '127.0.0.1';
    const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key') || '';
    const hasApiKey = authHeader.length > 5;
    const isCommercial = authHeader.length > 10;
    const maxReqs = isCommercial ? 300 : 60;
    const rl = checkRateLimit(clientIp, maxReqs, 60000);

    if (!rl.ok && path !== '/' && path !== '/health' && path !== '/demo') {
      return new Response(JSON.stringify({
        ok: false,
        valido: false,
        error: 'Limite temporário de requisições excedido. Aguarde o período indicado em Retry-After.',
        retryAfterSeconds: Math.ceil((rl.resetAt - Date.now()) / 1000)
      }, null, 2), {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...CORS_HEADERS,
          'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
          'X-RateLimit-Limit': String(maxReqs),
          'X-RateLimit-Remaining': String(rl.remaining)
        }
      });
    }

    // 4. Healthcheck e Status
    if (path === '/health' || path === '/status') {
      return new Response(JSON.stringify({
        ok: true,
        service: 'NCM Fiscal Pro API',
        cluster: 'Cloudflare Edge Anycast (diffstore264.workers.dev)',
        version: env.API_VERSION || '1.0.0',
        status: 'online',
        autenticado: hasApiKey,
        totalNcms: 15042,
        totalSecoes: 21,
        totalCapitulos: 96,
        padrao: 'Receita Federal do Brasil / Camex Mercosul',
        latency: 'sub-2ms',
        github: 'https://github.com/clepta2/ncmfiscal-pro',
        edgeLocation: request.cf ? request.cf.colo : 'Edge',
        timestamp: new Date().toISOString()
      }, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
      });
    }

    // 5. Landing Page / Demo Interativo
    if (path === '/' || path === '/demo' || path === '/index.html') {
      if (wantsJson) {
        return new Response(JSON.stringify({
          ok: true,
          service: 'NCM Fiscal Pro API',
          cluster: 'Cloudflare Edge Anycast (diffstore264.workers.dev)',
          version: env.API_VERSION || '1.0.0',
          totalNcms: 15042,
          rotas: {
            consulta: '/api/ncm/:codigo',
            busca: '/api/ncm/busca?q=smartphone',
            capitulos: '/api/ncm/capitulos',
            secoes: '/api/ncm/secoes',
            tributos: '/api/ncm/tributos?ncm=8517.13.00&valor=1500',
            validacao: '/api/ncm/validar?ncm=8517.13.00',
            lote: '/api/ncm/validar-lote (POST)'
          },
          github: 'https://github.com/clepta2/ncmfiscal-pro'
        }, null, 2), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
        });
      }
      return new Response(getHtmlDemo(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 6. As 21 Seções Oficiais Camex (/api/ncm/secoes ou /api/secoes)
    if (path === '/api/ncm/secoes' || path === '/api/secoes') {
      const secoes = NcmFiscalPro.listarSecoes();
      return new Response(JSON.stringify({
        ok: true,
        totalSecoes: secoes.length,
        secoes,
        timestamp: new Date().toISOString()
      }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
          ...CORS_HEADERS
        }
      });
    }

    // 7. Listagem de Capítulos Oficiais (/api/ncm/capitulos ou /api/capitulos)
    if (path === '/api/ncm/capitulos' || path === '/api/capitulos') {
      const capitulos = NcmFiscalPro.listarCapitulos();
      return new Response(JSON.stringify({
        ok: true,
        totalCapitulos: capitulos.length,
        capitulos,
        timestamp: new Date().toISOString()
      }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
          ...CORS_HEADERS
        }
      });
    }

    // 8. Cálculo de Tributos da Lei 12.741 / IBPT (/api/ncm/tributos)
    if (path === '/api/ncm/tributos' || path === '/api/tributos') {
      let ncm = url.searchParams.get('ncm') || url.searchParams.get('codigo') || '';
      let valor = parseFloat(url.searchParams.get('valor') || '100');

      if (!ncm && request.method === 'POST') {
        try {
          const body = await request.json();
          ncm = body.ncm || body.codigo || '';
          if (body.valor !== undefined) valor = parseFloat(body.valor);
        } catch (_) {}
      }

      const resTrib = NcmFiscalPro.estimarTributos(ncm, valor);
      const statusHttp = resTrib.ok ? 200 : 400;

      return new Response(JSON.stringify(resTrib, null, 2), {
        status: statusHttp,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...CORS_HEADERS
        }
      });
    }

    // 9. Busca Textual e por Prefixo (/api/ncm/busca ou /api/busca)
    if (path === '/api/ncm/busca' || path === '/api/busca') {
      const q = url.searchParams.get('q') || url.searchParams.get('query') || url.searchParams.get('termo') || '';
      const limit = url.searchParams.get('limit') || url.searchParams.get('limite') || 20;
      const page = url.searchParams.get('page') || url.searchParams.get('pagina') || 1;
      const faturavel = url.searchParams.get('faturavel') === 'true' || url.searchParams.get('apenasFaturaveis') === 'true';

      const resBusca = NcmFiscalPro.buscar(q, { limite: limit, pagina: page, apenasFaturaveis: faturavel });
      const statusHttp = resBusca.ok ? 200 : 400;

      return new Response(JSON.stringify(resBusca, null, 2), {
        status: statusHttp,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          ...CORS_HEADERS
        }
      });
    }

    // 10. Validação Rápida (/api/ncm/validar ou /api/validar-nfe)
    if (path === '/api/ncm/validar' || path === '/api/validar') {
      const ncm = url.searchParams.get('ncm') || url.searchParams.get('codigo') || url.searchParams.get('q') || '';
      const resVal = NcmFiscalPro.validar(ncm);
      return new Response(JSON.stringify({
        ok: true,
        ncmInformado: ncm,
        ...resVal,
        timestamp: new Date().toISOString()
      }, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
      });
    }

    // 11. Validação em Lote (/api/ncm/validar-lote ou /api/lote)
    if (path === '/api/ncm/validar-lote' || path === '/api/validar-lote' || path === '/api/lote') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ ok: false, error: 'Envie uma requisição POST com corpo JSON contendo {"ncms": [...]}' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
        });
      }
      try {
        const body = await request.json();
        const lista = Array.isArray(body.ncms) ? body.ncms : (Array.isArray(body) ? body : []);
        const maxItems = isCommercial ? 200 : 50;
        if (lista.length > maxItems) {
          return new Response(JSON.stringify({
            ok: false,
            error: `O lote aceita até ${maxItems} códigos NCM por requisição neste plano.`,
            maxItems
          }), {
            status: 413,
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
          });
        }
        const resLote = NcmFiscalPro.validarLote(lista);
        return new Response(JSON.stringify(resLote, null, 2), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: 'JSON inválido: ' + err.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
        });
      }
    }

    // 12. Consulta Direta de Código NCM (/api/ncm/:codigo ou /api/ncm?codigo=...)
    if (path.startsWith('/api/ncm/') || path === '/api/ncm') {
      let codigo = '';
      if (path.startsWith('/api/ncm/')) {
        codigo = decodeURIComponent(path.replace('/api/ncm/', '')).trim();
      } else {
        codigo = url.searchParams.get('codigo') || url.searchParams.get('ncm') || url.searchParams.get('q') || '';
      }

      if (!codigo && request.method === 'POST') {
        try {
          const body = await request.json();
          codigo = body.codigo || body.ncm || '';
        } catch (_) {}
      }

      if (!codigo) {
        return new Response(JSON.stringify({
          ok: false,
          valido: false,
          erro: 'Informe o código NCM. Exemplo: /api/ncm/8517.13.00 ou /api/ncm?codigo=85171300'
        }, null, 2), {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
        });
      }

      const resConsulta = NcmFiscalPro.consultar(codigo);
      const aud = NcmFiscalPro.gerarHashAuditoria(resConsulta.codigoLimpo || codigo, clientIp);
      resConsulta.auditoria = aud;

      const statusHttp = resConsulta.valido ? 200 : (resConsulta.ok === false ? 400 : 404);

      return new Response(JSON.stringify(resConsulta, null, 2), {
        status: statusHttp,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': resConsulta.valido ? 'public, max-age=86400' : 'no-store',
          'X-Audit-Hash': aud.hash,
          ...CORS_HEADERS
        }
      });
    }

    // 13. Rota Não Encontrada (404)
    return new Response(JSON.stringify({
      ok: false,
      error: 'Endpoint não encontrado.',
      rotasDisponiveis: [
        'GET /api/ncm/:codigo',
        'GET /api/ncm/busca?q=smartphone',
        'GET /api/ncm/capitulos',
        'GET /api/ncm/secoes',
        'GET /api/ncm/tributos?ncm=8517.13.00&valor=1500',
        'GET /api/ncm/validar?ncm=8517.13.00',
        'POST /api/ncm/validar-lote',
        'GET /health'
      ]
    }, null, 2), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
    });
  }
};

function getHtmlDemo() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NCM Fiscal Pro — Edge API &amp; SDK Oficial</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #080c16;
      --card: #0f172a;
      --card-hover: #1e293b;
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.2);
      --border: rgba(255, 255, 255, 0.08);
      --text: #f8fafc;
      --muted: #94a3b8;
      --code-bg: #030712;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      line-height: 1.6;
      padding: 0 16px;
    }
    .container { max-width: 1100px; margin: 0 auto; padding: 50px 0 80px; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--accent);
      border-radius: 99px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 40px;
      font-weight: 800;
      letter-spacing: -1px;
      margin-bottom: 14px;
      background: linear-gradient(135deg, #ffffff 40%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.lead { font-size: 18px; color: var(--muted); max-width: 760px; margin-bottom: 36px; }
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
    }
    .stat-val { font-size: 28px; font-weight: 800; color: var(--accent); }
    .stat-lbl { font-size: 13px; color: var(--muted); font-weight: 600; }
    .tester {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      margin-bottom: 40px;
    }
    .input-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    input[type="text"] {
      flex: 1;
      min-width: 280px;
      padding: 14px 18px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--code-bg);
      color: #fff;
      font-size: 16px;
      font-family: inherit;
    }
    input[type="text"]:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    button {
      padding: 14px 26px;
      border-radius: 12px;
      border: none;
      background: var(--accent);
      color: #000;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover { transform: translateY(-2px); box-shadow: 0 8px 20px var(--accent-glow); }
    .pills { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
    .pill {
      font-size: 12px;
      padding: 6px 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
      border-radius: 99px;
      cursor: pointer;
      color: var(--muted);
      transition: 0.15s;
    }
    .pill:hover { color: #fff; border-color: var(--accent); }
    pre {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
      color: #38bdf8;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      overflow-x: auto;
      max-height: 440px;
    }
    .endpoints-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 14px;
    }
    .endpoints-table th, .endpoints-table td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .endpoints-table th { color: var(--muted); font-size: 12px; text-transform: uppercase; }
    .method-get { color: #10b981; font-weight: 700; }
    .method-post { color: #38bdf8; font-weight: 700; }
    .footer { text-align: center; color: var(--muted); font-size: 13px; margin-top: 60px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">⚡ Cloudflare Edge Anycast &bull; Sub-2ms</div>
    <h1>NCM Fiscal Pro API &amp; SDK</h1>
    <p class="lead">Microsserviço de alta velocidade para consulta, árvore hierárquica, alíquotas estimadas (IBPT / Lei 12.741), sugestão de CEST e validação de 15.042 códigos NCM (Camex / Receita Federal). Proteção ativa contra a Rejeição 778 da SEFAZ.</p>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-val">15.042</div>
        <div class="stat-lbl">NCMs Oficiais</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">21</div>
        <div class="stat-lbl">Seções Camex</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">96</div>
        <div class="stat-lbl">Capítulos Mercosul</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">&lt; 2ms</div>
        <div class="stat-lbl">Latência na Borda</div>
      </div>
    </div>

    <div class="tester">
      <h3 style="margin-bottom:16px;">🔍 Teste em Tempo Real</h3>
      <div class="input-row">
        <input type="text" id="ncmInput" placeholder="Digite um código NCM (ex: 8517.13.00) ou termo (ex: smartphone, cerveja)" value="8517.13.00">
        <button onclick="executarTeste()">Consultar / Buscar</button>
      </div>
      <div class="pills">
        <span class="pill" onclick="testarExemplo('8517.13.00')">📱 8517.13.00 (Smartphones + CEST 21.053.00)</span>
        <span class="pill" onclick="testarExemplo('8471.30.12')">💻 8471.30.12 (Notebooks + CEST 21.001.00)</span>
        <span class="pill" onclick="testarExemplo('2203.00.00')">🍺 2203.00.00 (Cervejas + CEST 03.001.00)</span>
        <span class="pill" onclick="testarExemplo('3004.90.99')">💊 3004.90.99 (Medicamentos)</span>
        <span class="pill" onclick="testarExemplo('8517')">⚠️ 8517 (Posição 4 dígitos - Alerta SEFAZ)</span>
        <span class="pill" onclick="testarBusca('notebook')">🔍 Buscar "notebook"</span>
      </div>
      <pre id="outputJson">// Resposta da API aparecerá aqui...</pre>
    </div>

    <div class="tester">
      <h3 style="margin-bottom:16px;">📚 Endpoints da API (Cloudflare Anycast)</h3>
      <table class="endpoints-table">
        <thead>
          <tr>
            <th>Método</th>
            <th>Endpoint</th>
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="method-get">GET</span></td>
            <td><code>/api/ncm/:codigo</code></td>
            <td>Detalhes completos, Seção Camex, alíquotas IBPT, CEST sugerido e aptidão NF-e.</td>
          </tr>
          <tr>
            <td><span class="method-get">GET</span></td>
            <td><code>/api/ncm/busca?q=smartphone</code></td>
            <td>Busca textual e por prefixo com ranqueamento inteligente.</td>
          </tr>
          <tr>
            <td><span class="method-get">GET</span></td>
            <td><code>/api/ncm/tributos?ncm=...&valor=100</code></td>
            <td>Cálculo aproximado de tributos para cupom fiscal / NFC-e (Lei 12.741).</td>
          </tr>
          <tr>
            <td><span class="method-get">GET</span></td>
            <td><code>/api/ncm/secoes</code></td>
            <td>Lista as 21 Seções Oficiais da Tabela Camex (I a XXI).</td>
          </tr>
          <tr>
            <td><span class="method-get">GET</span></td>
            <td><code>/api/ncm/capitulos</code></td>
            <td>Lista todos os 96 capítulos do Mercosul (01 a 99).</td>
          </tr>
          <tr>
            <td><span class="method-get">GET</span></td>
            <td><code>/api/ncm/validar?ncm=...</code></td>
            <td>Validação rápida para formulários de cadastro de produto.</td>
          </tr>
          <tr>
            <td><span class="method-post">POST</span></td>
            <td><code>/api/ncm/validar-lote</code></td>
            <td>Auditoria de catálogo em massa (envia array de até 200 NCMs).</td>
          </tr>
          <tr>
            <td><span class="method-get">GET</span></td>
            <td><code>/health</code></td>
            <td>Telemetria e status operacional do cluster Cloudflare Edge.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      NCM Fiscal Pro &bull; Desenvolvido por <a href="https://github.com/clepta2" style="color:var(--accent);text-decoration:none;" target="_blank">clepta2</a> &bull; Licença MIT
    </div>
  </div>

  <script>
    async function executarTeste() {
      const val = document.getElementById('ncmInput').value.trim();
      const out = document.getElementById('outputJson');
      if (!val) return;
      out.innerText = 'Consultando Cloudflare Edge...';
      try {
        const apenasNum = val.replace(/\\D/g, '');
        let url = '';
        if (apenasNum.length >= 2 && !val.includes(' ') && val.length <= 11) {
          url = '/api/ncm/' + encodeURIComponent(val);
        } else {
          url = '/api/ncm/busca?q=' + encodeURIComponent(val) + '&limit=5';
        }
        const res = await fetch(url);
        const data = await res.json();
        out.innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        out.innerText = 'Erro ao consultar: ' + err.message;
      }
    }

    function testarExemplo(codigo) {
      document.getElementById('ncmInput').value = codigo;
      executarTeste();
    }

    function testarBusca(termo) {
      document.getElementById('ncmInput').value = termo;
      executarTeste();
    }

    executarTeste();
  </script>
</body>
</html>`;
}
