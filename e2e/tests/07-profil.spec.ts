import { test, expect } from '@playwright/test';
import { loginViaUi, TEST_PASSWORDS } from '../helpers.js';

/**
 * Minimales 1×1 transparentes PNG — valides Bild für sharp, klein genug für Tests.
 */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const API_BASE = `http://127.0.0.1:${process.env['E2E_BACKEND_PORT'] ?? 3101}`;

test.describe('Profil-Seite', () => {
  /**
   * Mitglied setzt seine E-Mail-Adresse und sieht sie anschließend
   * in der Profil-Karte.
   */
  test('E-Mail setzen und in der Profil-Karte anzeigen', async ({ page }) => {
    await loginViaUi(page, 'anna', TEST_PASSWORDS.anna);
    await page.goto('/profil');

    // E-Mail-Formularfeld befüllen und speichern
    await page.getByLabel('E-Mail-Adresse').fill('anna@e2e.test');
    await page.getByRole('button', { name: 'Speichern' }).click();

    // Erfolgs-Toast bestätigt das Speichern
    await expect(page.getByText('Profil gespeichert.')).toBeVisible({ timeout: 5_000 });

    // E-Mail erscheint jetzt in der Profil-Karte
    await expect(page.getByText('anna@e2e.test')).toBeVisible();
  });

  /**
   * Mitglied lädt ein Profilbild hoch — danach wird ein <img> statt des
   * Initialen-Platzhalters angezeigt.
   */
  test('Profilbild hochladen und Avatar-Bild sehen', async ({ page }) => {
    await loginViaUi(page, 'bernd', TEST_PASSWORDS.bernd);
    await page.goto('/profil');

    // Vor dem Upload: kein <img> mit /avatars/-Pfad sichtbar
    await expect(page.locator('img[src^="/avatars/"]')).toHaveCount(0);

    // Datei über das versteckte file-Input hochladen
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });

    // Toast bestätigt den Upload
    await expect(page.getByText('Profilbild gespeichert.')).toBeVisible({ timeout: 10_000 });

    // Avatar-Bild ist nun sichtbar
    await expect(page.locator('img[src^="/avatars/"]')).toBeVisible({ timeout: 5_000 });
  });

  /**
   * Beim Versuch, eine bereits belegte E-Mail-Adresse zu setzen, erscheint
   * ein Fehler-Toast.
   */
  test('E-Mail-Konflikt zeigt Fehler-Toast', async ({ page, request }) => {
    // Anna bekommt die E-Mail via API (kein UI-Roundtrip nötig)
    const loginRes = await request.post(`${API_BASE}/api/v1/auth/login`, {
      data: { username: 'anna', password: TEST_PASSWORDS.anna },
    });
    const { token } = (await loginRes.json()) as { token: string };
    await request.patch(`${API_BASE}/api/v1/auth/me`, {
      data: { email: 'belegt@e2e.test' },
      headers: { Authorization: `Bearer ${token}` },
    });

    // Bernd versucht dieselbe E-Mail über die UI zu setzen
    await loginViaUi(page, 'bernd', TEST_PASSWORDS.bernd);
    await page.goto('/profil');
    await page.getByLabel('E-Mail-Adresse').fill('belegt@e2e.test');
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByText('Diese E-Mail-Adresse wird bereits verwendet.')).toBeVisible({
      timeout: 5_000,
    });
  });
});
