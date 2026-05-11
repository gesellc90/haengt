import pino from 'pino';

export function createLogger(level: pino.LevelWithSilent = 'info'): pino.Logger {
  return pino({
    level,
    // Im Dev hübsche Ausgabe, in Prod NDJSON für Log-Aggregation.
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });
}
