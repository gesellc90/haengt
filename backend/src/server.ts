import { createApp } from './app.js';
import { loadEnv } from './utils/env.js';
import { createLogger } from './utils/logger.js';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const app = createApp({ logger });

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Backend ist bereit');
});

// Sauberer Shutdown bei SIGTERM/SIGINT (wichtig für systemd auf dem Pi).
const shutdown = (signal: NodeJS.Signals): void => {
  logger.info({ signal }, 'Shutdown angefordert');
  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Fehler beim Herunterfahren');
      process.exit(1);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
