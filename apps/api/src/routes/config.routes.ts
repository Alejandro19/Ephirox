import { Router } from 'express';

export const configRouter = Router();

configRouter.get('/config', (_req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || null;
  const appleClientId = process.env.APPLE_CLIENT_ID || null;
  res.json({ success: true, googleClientId, appleClientId });
});
