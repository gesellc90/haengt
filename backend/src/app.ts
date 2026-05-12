import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import type { Db } from './db/client.js';
import type { Env } from './utils/env.js';
import { MembersRepo, AuditLogRepo, TokenBlocklistRepo } from './db/repos/index.js';
import { AuthService } from './services/AuthService.js';
import { healthRouter } from './routes/health.js';
import { createAuthRouter } from './routes/auth.js';

export interface AppOptions {
  logger: Logger;
  db: Db;
  env: Env;
}

/**
 * Baut die Express-App auf und gibt sie zurück.
 * Trennt App-Konstruktion vom Listen-Start, damit Tests die App
 * ohne offenen Port via Supertest ansprechen können.
 */
export function createApp({ logger, db, env }: AppOptions): Express {
  const app = express();

  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  // -- Repos & Services -------------------------------------------------------
  const membersRepo = new MembersRepo(db);
  const auditLogRepo = new AuditLogRepo(db);
  const tokenBlocklistRepo = new TokenBlocklistRepo(db);

  const authService = new AuthService(
    membersRepo,
    auditLogRepo,
    tokenBlocklistRepo,
    env.JWT_SECRET,
    env.JWT_EXPIRES_IN,
  );

  // -- Routen -----------------------------------------------------------------
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', createAuthRouter(authService));

  return app;
}
