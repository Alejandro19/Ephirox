import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { authRouter } from './routes/auth.routes.js';
import { clientsRouter } from './routes/clients.routes.js';
import { personalInfoRouter } from './routes/personal-info.routes.js';
import { configRouter } from './routes/config.routes.js';
import { geoRouter } from './routes/geo.routes.js';
import { exercisesRouter } from './routes/exercises.routes.js';
import { trainingRouter } from './routes/training.routes.js';
import { nutritionRouter } from './routes/nutrition.routes.js';
import { supplementsRouter } from './routes/supplements.routes.js';
import { adminPhrasesRouter } from './routes/admin-phrases.routes.js';
import { adminQuotesRouter } from './routes/admin-quotes.routes.js';
import { restToolsRouter } from './routes/rest-tools.routes.js';
import { adminCortisolTipsRouter } from './routes/admin-cortisol-tips.routes.js';
import { adminNutritionTipsRouter } from './routes/admin-nutrition-tips.routes.js';
import { recipesRouter } from './routes/recipes.routes.js';
import { cortisolTechniquesRouter } from './routes/cortisol-techniques.routes.js';
import { cortisolLogsRouter } from './routes/cortisol-logs.routes.js';
import { cognitiveLoadRouter } from './routes/cognitive-load.routes.js';
import { sleepRouter } from './routes/sleep.routes.js';
import { eventsRouter } from './routes/events.routes.js';
import { therapiesRouter } from './routes/therapies.routes.js';
import { retreatsRouter } from './routes/retreats.routes.js';
import { evolutionRouter } from './routes/evolution.routes.js';
import { wellnessIndexRouter } from './routes/wellness-index.routes.js';
import { labPanelsRouter } from './routes/lab-panels.routes.js';
import { insightsRouter } from './routes/insights.routes.js';
import { checkinsRouter } from './routes/checkins.routes.js';
import { wearableRouter, wearableOAuthRouter } from './routes/wearable.routes.js';
import { blindspotRouter } from './routes/blindspot.routes.js';
import { rolesRouter } from './routes/roles.routes.js';
import { adminNotificationsRouter, clientNotificationsRouter } from './routes/notifications.routes.js';
import { accountRouter } from './routes/account.routes.js';
import { membershipPricesRouter } from './routes/membership-prices.routes.js';
import { stripeWebhookRouter } from './routes/stripe-webhook.routes.js';
import { wompiWebhookRouter } from './routes/wompi-webhook.routes.js';
import { wearableWebhookRouter } from './routes/wearable-webhook.routes.js';
import { enterpriseLeadsRouter } from './routes/enterprise-leads.routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  // CORS con lista específica de orígenes + credentials: true — ya no puede
  // ser origin: '*' (el navegador prohíbe combinarlo con credentials: true)
  // desde que el login pasó a fijar la sesión en una cookie httpOnly en vez
  // de solo devolver el token en el body (ver auditoría de seguridad: un
  // token legible por JS en sessionStorage es robable por cualquier XSS en
  // cualquier parte del sitio). CORS_ORIGINS es una lista separada por comas;
  // el default cubre los dominios conocidos de este proyecto.
  const CORS_ORIGINS = (
    process.env.CORS_ORIGINS ||
    'https://ephirox.com,https://www.ephirox.com,https://app.ephirox.com,http://localhost:3000'
  ).split(',').map((o) => o.trim());
  app.use(cors({
    origin(origin, callback) {
      // Sin header Origin (curl, server-to-server, health checks) — permitir;
      // no hay navegador de por medio que necesite protección de CORS acá.
      if (!origin || CORS_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error('Origen no permitido por CORS.'));
    },
    credentials: true,
  }));

  // Headers de seguridad — helmet ya estaba en package.json pero nunca se
  // montó (ver auditoría de seguridad). CSP por defecto no tiene mucho
  // efecto sobre una API JSON pura, pero X-Content-Type-Options, HSTS y el
  // resto de defaults sí aplican. `crossOriginResourcePolicy: false` porque
  // el default (`same-origin`) rompería fetch() desde app.ephirox.com (otro
  // origin) contra esta API — ya cubierto explícitamente por el CORS de
  // arriba, esa es la capa que decide qué orígenes pueden leer la respuesta.
  app.use(helmet({ crossOriginResourcePolicy: false }));

  // gzip/brotli en todas las respuestas — las de listados (evolution,
  // achievements, etc.) son JSON repetitivo, comprimen muy bien.
  app.use(compression());

  // Webhooks de proveedores de pago — DEBEN montarse antes del express.json()
  // global de abajo: cada proveedor exige el body crudo (sin parsear) para
  // verificar su firma/checksum (ver *-webhook.routes.ts, que traen su
  // propio express.raw()).
  app.use('/api/stripe', stripeWebhookRouter);
  app.use('/api/wompi', wompiWebhookRouter);
  app.use('/api/webhooks/wearable', wearableWebhookRouter);

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ success: true, status: 'ok' });
  });

  app.use('/api', configRouter);
  app.use('/api', geoRouter);
  app.use('/api', adminPhrasesRouter);
  app.use('/api', adminQuotesRouter);
  app.use('/api', restToolsRouter);
  app.use('/api', adminCortisolTipsRouter);
  app.use('/api', adminNutritionTipsRouter);
  app.use('/api', recipesRouter);
  app.use('/api', eventsRouter);
  app.use('/api', therapiesRouter);
  app.use('/api', retreatsRouter);
  app.use('/api', evolutionRouter);
  app.use('/api', wellnessIndexRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/clients', personalInfoRouter);
  app.use('/api/clients', exercisesRouter);
  app.use('/api/clients', trainingRouter);
  app.use('/api/clients', nutritionRouter);
  app.use('/api/clients', supplementsRouter);
  app.use('/api/clients', cortisolTechniquesRouter);
  app.use('/api/clients', cortisolLogsRouter);
  app.use('/api/clients', cognitiveLoadRouter);
  app.use('/api/clients', sleepRouter);
  app.use('/api/clients', labPanelsRouter);
  app.use('/api/clients', insightsRouter);
  app.use('/api/clients', checkinsRouter);
  app.use('/api/clients', wearableRouter);
  app.use('/api/wearable', wearableOAuthRouter);
  app.use('/api/blindspot', blindspotRouter);
  app.use('/api', rolesRouter);
  app.use('/api', adminNotificationsRouter);
  app.use('/api/clients', clientNotificationsRouter);
  app.use('/api/account', accountRouter);
  app.use('/api', membershipPricesRouter);
  app.use('/api', enterpriseLeadsRouter);

  // Error handler
  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  });

  // 404 catch-all
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  });

  return app;
}