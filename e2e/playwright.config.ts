import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright-Konfiguration für die E2E-Suite.
 *
 * - Tests laufen in Chromium (Pi-Mitglieder nutzen primär mobile Browser,
 *   wir simulieren ein Pixel-5-Viewport).
 * - globalSetup startet das Backend gegen eine temporäre SQLite-Datei und
 *   einen `vite preview`-Server auf Port 4173.
 * - Auf CI Trace + Video bei Fehler, lokal nur Trace on retry.
 */

const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Backend ist single-instance auf einem festen Port.
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',

  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:4173',
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium-mobile',
      // Pixel 5 ≈ 393×851, Touch, Mobile-UA — gut für unsere Buchungsseite.
      use: { ...devices['Pixel 5'] },
    },
  ],

  expect: {
    timeout: 5_000,
  },
});
