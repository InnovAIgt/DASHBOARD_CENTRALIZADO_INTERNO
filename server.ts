import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { obtenerPaginaReuniones } from './server/marketingReuniones.js';

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
