import { z } from 'zod';

/**
 * Schema für die ENV-Variablen des Backends.
 * Wird beim Start in `server.ts` einmal validiert — fehlende oder ungültige
 * Werte führen zu einem klaren Fehler statt zu unerklärlichem Verhalten zur Laufzeit.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  /** Pfad zur SQLite-Datei. `:memory:` ist gültig (für Tests). */
  DB_PATH: z.string().default('./data/getraenke.db'),
  /** Mindestens 32 Zeichen – zufälliger String, nie in die Versionskontrolle! */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET muss mindestens 32 Zeichen lang sein'),
  JWT_EXPIRES_IN: z.string().default('8h'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Ungültige ENV-Konfiguration:\n${issues}`);
  }
  return parsed.data;
}
