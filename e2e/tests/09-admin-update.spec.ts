/**
 * E2E für den Admin-Bereich „System / Update" (M14).
 *
 * Der Auto-Update-Helper (scripts/pi-self-update.sh) läuft in der
 * E2E-Umgebung nicht — wir legen die Statusdatei direkt in
 * UPDATE_STATE_DIR ab (derselbe Pfad, den globalSetup dem Backend über
 * die ENV-Variable mitgibt) und prüfen, dass die UI sie korrekt anzeigt
 * sowie dass „Jetzt aktualisieren" die erwartete Marker-Datei schreibt.
 */

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loginViaUi, TEST_PASSWORDS } from '../helpers.js';

// Gleicher Fallback wie in global-setup.ts — beide Prozesse berechnen
// unabhängig denselben Pfad (analog zu E2E_BACKEND_PORT/E2E_FRONTEND_PORT).
const UPDATE_STATE_DIR =
  process.env['E2E_UPDATE_STATE_DIR'] ?? path.join(os.tmpdir(), 'getraenke-e2e-update-state');
const STATUS_FILE = path.join(UPDATE_STATE_DIR, 'update-status.json');
const MARKER_FILE = path.join(UPDATE_STATE_DIR, 'update-requested');

function writeStatus(status: Record<string, unknown>): void {
  fs.mkdirSync(UPDATE_STATE_DIR, { recursive: true });
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status), 'utf-8');
}

test.describe('Admin: System/Update-Bereich', () => {
  test.beforeEach(() => {
    fs.rmSync(MARKER_FILE, { force: true });
    writeStatus({
      current_version: 'v0.5.0',
      available_version: 'v0.6.0',
      last_checked_at: '2026-07-01T03:30:00Z',
      last_result: 'update_available',
      last_trigger: 'timer',
      in_progress: false,
    });
  });

  test.afterEach(() => {
    fs.rmSync(MARKER_FILE, { force: true });
    fs.rmSync(STATUS_FILE, { force: true });
  });

  test('zeigt Version & Status, „Jetzt aktualisieren" schreibt die Marker-Datei', async ({
    page,
  }) => {
    await loginViaUi(page, 'admin', TEST_PASSWORDS.admin);
    await page.goto('/admin/system');
    // Web-Fonts (Cormorant Garamond etc., `display=swap`) laden asynchron nach
    // und verschieben beim Swap den Textfluss — ohne diese Wartezeit reflowt
    // der Beschreibungstext während der Klick-Versuche und verschiebt die
    // Buttons darunter (Flakiness).
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByText('Update verfügbar')).toBeVisible();
    await expect(page.getByText('v0.5.0')).toBeVisible();
    await expect(page.getByText('v0.6.0')).toBeVisible();

    // Bestätigungsdialog automatisch akzeptieren.
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: 'Jetzt aktualisieren' }).click();

    await expect(page.getByText('Update angestoßen')).toBeVisible();

    await expect
      .poll(() => (fs.existsSync(MARKER_FILE) ? fs.readFileSync(MARKER_FILE, 'utf-8') : null))
      .toBe('update');
  });

  test('„Jetzt aktualisieren" installiert nichts, wenn der Dialog abgebrochen wird', async ({
    page,
  }) => {
    await loginViaUi(page, 'admin', TEST_PASSWORDS.admin);
    await page.goto('/admin/system');
    await page.evaluate(() => document.fonts.ready);

    page.once('dialog', (dialog) => void dialog.dismiss());
    await page.getByRole('button', { name: 'Jetzt aktualisieren' }).click();

    // Kurz warten und sicherstellen, dass kein Marker geschrieben wurde.
    await page.waitForTimeout(500);
    expect(fs.existsSync(MARKER_FILE)).toBe(false);
  });

  test('Nicht-Admin sieht den Systembereich nicht', async ({ page }) => {
    await loginViaUi(page, 'anna', TEST_PASSWORDS.anna);
    await page.goto('/admin/system');

    // ProtectedRoute leitet bei falscher Rolle auf "/" um, das wiederum auf
    // /buchen weiterleitet.
    await expect(page).toHaveURL(/\/buchen$/);
    await expect(page.getByText('Update verfügbar')).not.toBeVisible();
  });
});
