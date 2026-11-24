import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getDispatchData } from './server/bodega-despachos.mjs';
import { obtenerPaginaReuniones } from './server/marketingReuniones.js';
import { reenviarSac } from './server/sacProxy.js';
import { procesarWebhookBrevo } from './server/brevoWebhook.js';
import { responderCampanas } from './server/mailing/campanas.js';
import { responderResumen } from './server/mailing/resumen.js';
import { responderCargo } from './server/mailing/cargoEditar.js';
import { responderDetalle } from './server/mailing/detalle.js';
import { obtenerPreofertas } from './server/flashPreofertas.js';

// Lee primero .env.local (llaves locales, nunca se suben) y luego .env.
dotenv.config({ path: ['.env.local', '.env'] });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static assets from public directly with correct MIME types
app.use(express.static(path.resolve(__dirname, 'public')));

// Marketing · Flujo de ventas v2: conexión segura con Prospekt IA (docs/marketing/README.md).
// En Vercel esta misma ruta la atiende api/marketing/reuniones.js.
app.all('/api/marketing/reuniones', async (req, res) => {
  const resultado = await obtenerPaginaReuniones({
    method: req.method,
    offset: typeof req.query.offset === 'string' ? req.query.offset : undefined,
  });
  if (resultado.status === 405) res.setHeader('Allow', 'GET');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', resultado.contentType);
  res.status(resultado.status).send(resultado.body);
});

// Servicio al Cliente · datos de SAC por el servidor (solo lectura, evita el bloqueo CORS de las Edge Functions).
// /api/sac/corte, /api/sac/vivo y /api/sac/historico. En Vercel las atienden api/sac/*.js.
app.all('/api/sac/:fuente(corte|vivo|historico)', async (req, res) => {
  const i = req.originalUrl.indexOf('?');
  const resultado = await reenviarSac({ fuente: req.params.fuente, method: req.method, query: i < 0 ? '' : req.originalUrl.slice(i) });
  for (const [clave, valor] of Object.entries(resultado.headers)) res.setHeader(clave, valor);
  res.status(resultado.status).send(resultado.body);
});

// Canales de marketing · avisos (webhooks de marketing) de Brevo, protegidos con BREVO_WEBHOOK_SECRET.
// Guarda en el proyecto Supabase «Dashboard Canales de marketing». En Vercel: api/marketing/brevo-webhook.js.
app.all('/api/marketing/brevo-webhook', async (req, res) => {
  const resultado = await procesarWebhookBrevo({ method: req.method, headers: req.headers, body: req.body });
  for (const [clave, valor] of Object.entries(resultado.headers)) res.setHeader(clave, valor);
  res.status(resultado.status).send(resultado.body);
});

// Canales de marketing · Mailing: campañas de Brevo con sus totales (sin datos personales, con caché).
// En Vercel: api/marketing/mailing/campanas.js.
app.all('/api/marketing/mailing/campanas', async (req, res) => {
  const resultado = await responderCampanas({ method: req.method });
  for (const [clave, valor] of Object.entries(resultado.headers)) res.setHeader(clave, valor);
  res.status(resultado.status).send(resultado.body);
});

// Canales de marketing · Mailing: conteos de los eventos del webhook (nunca correos). En Vercel: api/marketing/mailing/resumen.js.
app.all('/api/marketing/mailing/resumen', async (req, res) => {
  const campanas = typeof req.query.campanas === 'string' ? req.query.campanas : '';
  const resultado = await responderResumen({ method: req.method, query: { campanas } });
  for (const [clave, valor] of Object.entries(resultado.headers)) res.setHeader(clave, valor);
  res.status(resultado.status).send(resultado.body);
});

// Canales de marketing · Mailing: guardar cargo y objetivo con clave de Marketing (sin inicio de sesión; decisión de
// Keily, DECISIONES.md). Solo escribe en mkt_campana_cargo. En Vercel: api/marketing/mailing/cargo.js.
app.all('/api/marketing/mailing/cargo', async (req, res) => {
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'desconocida').split(',')[0].trim();
  const resultado = await responderCargo({ method: req.method, body: req.body, ip });
  for (const [clave, valor] of Object.entries(resultado.headers)) res.setHeader(clave, valor);
  res.status(resultado.status).send(resultado.body);
});

// Canales de marketing · Mailing: detalle por correo. Muestra correos sin inicio de sesión (decisión de Keily,
// docs/marketing/v2/DECISIONES.md); interruptor MKT_MOSTRAR_CORREOS. En Vercel: api/marketing/mailing/detalle.js.
app.all('/api/marketing/mailing/detalle', async (req, res) => {
  const campanas = typeof req.query.campanas === 'string' ? req.query.campanas : '';
  const resultado = await responderDetalle({ method: req.method, query: { campanas } });
  for (const [clave, valor] of Object.entries(resultado.headers)) res.setHeader(clave, valor);
  res.status(resultado.status).send(resultado.body);
});

// Ventas · Flash de Altas: proxy seguro para consultar preofertas de Workflow.
app.all('/api/ventas/flash-preofertas', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const resultado = await obtenerPreofertas({ method: req.method });
  if (resultado.status === 405) res.setHeader('Allow', 'GET');
  res.status(resultado.status).json(resultado.body);
});

app.get('/api/bodega/despachos', async (req, res) => {
  const country = String(req.query.pais || 'combined');
  if (!['combined','GT','SV'].includes(country)) { res.status(400).json({ error: 'País inválido' }); return; }
  res.setHeader('Cache-Control', 'no-store');
  try { const data = await getDispatchData({ country }); res.status(data.paises.some(pais => pais.ok) ? 200 : 502).json(data); }
  catch (error: any) { res.status(503).json({ error: error.message }); }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'RED INTELFON Banking Dashboard',
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
    makeConfigured: !!(process.env.MAKE_WEBHOOK_URL || process.env.VITE_MAKE_WEBHOOK_URL),
    historyConfigured: !!(process.env.HISTORY_WEBHOOK_URL || process.env.VITE_HISTORY_WEBHOOK_URL)
  });
});

// Proxy for Make.com Webhook Upload
app.post('/api/make/upload', async (req, res) => {
  const makeWebhookUrl =
    process.env.MAKE_WEBHOOK_URL ||
    process.env.VITE_MAKE_WEBHOOK_URL ||
    'https://hook.eu2.make.com/uf2f68usry02c9ljgb8wcoy634ymbkcf';

  try {
    const payload = req.body;
    console.log('[Server API] Forwarding report to Make.com Webhook:', {
      url: makeWebhookUrl,
      region: payload.region,
      pais: payload.pais,
      executionId: payload.ejecucion_id || payload.execution_id
    });

    const formData = new FormData();
    Object.keys(payload).forEach((key) => {
      formData.append(key, typeof payload[key] === 'object' ? JSON.stringify(payload[key]) : String(payload[key]));
    });

    const makeRes = await fetch(makeWebhookUrl, {
      method: 'POST',
      body: formData
    });

    const responseText = await makeRes.text();
    console.log(`[Server API] Make responded HTTP ${makeRes.status}: ${responseText.slice(0, 150)}`);

    res.status(makeRes.status).send(responseText);
  } catch (error: any) {
    console.error('[Server API] Error forwarding to Make:', error);
    res.status(500).json({ error: error?.message || 'Error communicating with Make.com' });
  }
});

// Proxy for History Webhook (Google Sheets / Notion)
app.get('/api/history', async (req, res) => {
  const historyWebhookUrl =
    process.env.HISTORY_WEBHOOK_URL ||
    process.env.VITE_HISTORY_WEBHOOK_URL ||
    'https://hook.eu2.make.com/fa2xcbqi6a9aupb9bby5wqp5wuelk9ea';

  try {
    const response = await fetch(historyWebhookUrl, { method: 'GET' });
    if (!response.ok) {
      return res.status(response.status).json({ error: `Make responded with status ${response.status}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('[Server API] Error querying history webhook:', error);
    res.status(500).json({ error: error?.message || 'Error querying history webhook' });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development mode: Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('/api/*', (req, res) => {
      res.status(404).json({ error: 'Endpoint no encontrado' });
    });
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] RED INTELFON Dashboard running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[Server] Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
