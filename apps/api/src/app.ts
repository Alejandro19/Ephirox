import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import { authRouter } from './routes/auth.routes.js';
import { clientsRouter } from './routes/clients.routes.js';
import { personalInfoRouter } from './routes/personal-info.routes.js';
import { geoRouter } from './routes/geo.routes.js';
import { exercisesRouter } from './routes/exercises.routes.js';
import { trainingRouter } from './routes/training.routes.js';
import { adminPhrasesRouter } from './routes/admin-phrases.routes.js';

const ALLOWED_ORIGINS = ['https://latribu-oficial.vercel.app', 'http://localhost:3000'];

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }));
  app.use(cors({ origin: ALLOWED_ORIGINS, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ success: true, status: 'ok' });
  });

  app.use('/api', geoRouter);
  app.use('/api', adminPhrasesRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/clients', personalInfoRouter);
  app.use('/api/clients', exercisesRouter);
  app.use('/api/clients', trainingRouter);

  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  });

  return app;
}
