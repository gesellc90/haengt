import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import { healthRouter } from './routes/health.js';

export interface AppOptions {
  logger: Logger;
}

/**
 * Baut die Express-App auf und gibt sie zurück.
 * Trennt App-Konstruktion vom Listen-Start, damit Tests die App
 * ohne offenen Port via Supertest ansprechen können.
 */
export function createApp({ logger }: AppOptions): Express {
  const app = express();

  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  app.use('/api/v1', healthRouter);

  return app;
}
