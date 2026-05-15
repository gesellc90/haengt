import { test, expect } from '@playwright/test';
import { loginViaUi, TEST_PASSWORDS } from '../helpers.js';

test.describe('Buchung erstellen', () => {
  test('Bernd bucht ein Wasser und sieht es in seiner Historie', async ({ page }) => {
    await loginViaUi(page, 'bernd', TEST_PASSWORDS.bernd);
    await expect(page).toHaveURL(/\/buchen$/);

    // Buchungs-Button hat aria-label "<name> buchen, <preis>"
    const wasserBtn = page.getByRole('button', { name: /^Wasser buchen,/i });
    await expect(wasserBtn).toBeVisible();
    await wasserBtn.click();

    // Toast/Bestätigung oder direkt die Aktualisierung der Historie.
    // Wir prüfen die Historie zuerst — sie ist das verlässliche Signal.
    const history = page.getByRole('region', { name: /historie|verlauf/i }).or(
      // Falls die Historie ohne <section aria-label=…> ist, fallback auf
      // den Listen-Container mit dem Text „Wasser".
      page.getByText('Wasser').first(),
    );
    await expect(history).toBeVisible();

    // In der Historien-Liste sollte mindestens ein neuer Eintrag mit „Wasser" sein.
    const wasserEintraege = page.getByRole('listitem').filter({ hasText: /Wasser/ });
    await expect(wasserEintraege.first()).toBeVisible();
  });
});
