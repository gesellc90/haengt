import { z } from 'zod';

/**
 * Schema für die ENV-Variablen des Backends.
 * Wird beim Start in `server.ts` einmal validiert — fehlende oder ungültige
 * Werte führen zu einem klaren Fehler statt zu unerklärlichem Verhalten zur Laufzeit.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  // JWT-Felder bleiben optional, bis M3 sie scharf schaltet.
  JWT_SECRET: z.string().min(16).optional(),
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
