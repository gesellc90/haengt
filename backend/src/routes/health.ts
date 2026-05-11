import { Router } from 'express';

/**
 * GET /api/v1/health
 * Einfacher Liveness-Check — kein Auth, keine DB-Abfrage.
 * Wird vom Smoke-Test im Deployment (M7) verwendet.
 */
export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
