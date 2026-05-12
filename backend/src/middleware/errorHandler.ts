import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { Logger } from 'pino';

// ---------------------------------------------------------------------------
// AppError – domänenspezifische HTTP-Fehler (throw statt next(err))
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ---------------------------------------------------------------------------
// Globaler Express-Error-Handler
// Muss als letztes Middleware in app.ts registriert werden.
// Die vier Parameter sind für Express zwingend (sonst wird es nicht als
// Error-Handler erkannt).
// ---------------------------------------------------------------------------

export function createErrorHandler(logger: Logger) {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    // Zod-Validierungsfehler → 400
    if (err instanceof ZodError) {
      res.status(400).json({
        error: 'Ungültige Eingabe',
        details: err.flatten(),
      });
      return;
    }

    // Domänen-/Business-Logik-Fehler → jeweiliger Statuscode
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: err.message,
        ...(err.code !== undefined ? { code: err.code } : {}),
      });
      return;
    }

    // Unerwartete Fehler → 500
    logger.error({ err }, 'Unbehandelter Fehler');
    res.status(500).json({ error: 'Interner Serverfehler' });
  };
}
