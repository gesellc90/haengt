import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import type { Db } from './db/client.js';
import type { Env } from './utils/env.js';
import {
  MembersRepo,
  DrinksRepo,
  BookingsRepo,
  AuditLogRepo,
  TokenBlocklistRepo,
} from './db/repos/index.js';
import { AuthService } from './services/AuthService.js';
import { MembersService } from './services/MembersService.js';
import { DrinksService } from './services/DrinksService.js';
import { BookingService } from './services/BookingService.js';
import { ReportService } from './services/ReportService.js';
import { healthRouter } from './routes/health.js';
import { createAuthRouter } from './routes/auth.js';
import { createMembersRouter } from './routes/members.js';
import { createDrinksRouter } from './routes/drinks.js';
import { createBookingsRouter } from './routes/bookings.js';
import { createReportsRouter } from './routes/reports.js';
import { createErrorHandler } from './middleware/errorHandler.js';

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
  const drinksRepo = new DrinksRepo(db);
  const bookingsRepo = new BookingsRepo(db);

  const authService = new AuthService(
    membersRepo,
    auditLogRepo,
    tokenBlocklistRepo,
    env.JWT_SECRET,
    env.JWT_EXPIRES_IN,
  );

  const membersService = new MembersService(membersRepo, auditLogRepo);
  const drinksService = new DrinksService(drinksRepo, auditLogRepo);
  const bookingService = new BookingService(bookingsRepo, drinksRepo, auditLogRepo);
  const reportService = new ReportService(bookingsRepo, membersRepo);

  // -- Routen -----------------------------------------------------------------
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', createAuthRouter(authService));
  app.use('/api/v1/members', createMembersRouter(authService, membersService));
  app.use('/api/v1/drinks', createDrinksRouter(authService, drinksService));
  app.use('/api/v1/bookings', createBookingsRouter(authService, bookingService));
  app.use('/api/v1/reports', createReportsRouter(authService, reportService));

  // -- Globaler Error-Handler (muss nach allen Routen stehen) -----------------
  app.use(createErrorHandler(logger));

  return app;
}
