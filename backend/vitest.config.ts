import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      // Bootstrap-/CLI-Skripte und triviale Wrapper sind keine Unit-Test-Ziele:
      // sie werden über E2E bzw. beim App-Start abgedeckt, nicht in Vitest.
      exclude: [
        'src/server.ts',
        'src/db/seed.ts',
        'src/db/migrate-cli.ts',
        'src/utils/logger.ts',
        'src/**/*.d.ts',
      ],
      // Mindest-Abdeckung als Ratsche gegen stille Erosion. Werte mit Puffer
      // unter dem Ist-Stand, damit normale Änderungen nicht grundlos rot werden.
      // Baseline an @vitest/coverage-v8 v4 angepasst (dessen AST-Remapping misst
      // strenger als v1 → ~8 Punkte niedriger bei identischen Tests).
      thresholds: {
        statements: 78,
        lines: 78,
        functions: 85,
        branches: 70,
      },
    },
  },
});
