import { test, expect } from '@playwright/test';
import { loginViaUi, TEST_PASSWORDS } from '../helpers.js';

/**
 * Theken-Modus (Allgemein-Konto, can_book_for_others):
 * Login → nach Kategorie gruppierte Mitgliederübersicht → Mitglied wählen →
 * Strich setzen → Storno → „Fertig" → zurück zur Übersicht.
 */
test.describe('Theken-Flow (Allgemein-Konto)', () => {
  test('bucht und storniert für ein anderes Mitglied und kehrt zur Übersicht zurück', async ({
    page,
  }) => {
    await loginViaUi(page, 'allgemein', TEST_PASSWORDS.allgemein);
    await expect(page).toHaveURL(/\/buchen$/);

    // Statt der eigenen Stube erscheint die nach Kategorie gruppierte Übersicht.
    await expect(page.getByRole('heading', { name: 'Aktive' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alte Herren' })).toBeVisible();

    const annaTile = page.getByRole('button', { name: 'Anna Muster' });
    await expect(annaTile).toBeVisible();
    // Bernd (alter_herr) liegt in einer anderen Kategorie.
    await expect(page.getByRole('button', { name: 'Bernd Beispiel' })).toBeVisible();

    // Mitglied wählen → Buchungsansicht.
    await annaTile.click();

    // Saldo-Karte trägt jetzt den Namen des gewählten Mitglieds.
    await expect(page.getByText('Anna Muster')).toBeVisible();

    // Strich setzen — Cola.
    await page.getByRole('button', { name: /^Cola buchen,/i }).click();

    const colaItem = page.getByRole('listitem').filter({ hasText: /Cola/ }).first();
    await expect(colaItem).toBeVisible();

    // Frische Buchung im 5-Minuten-Fenster wieder stornieren.
    await colaItem.getByRole('button', { name: 'Strich stornieren' }).click();
    await expect(colaItem)
      .toContainText(/storniert/i, { timeout: 5_000 })
      .catch(async () => {
        await expect(colaItem).not.toBeVisible();
      });

    // Toast „Strich wurde storniert." abklingen lassen — er liegt sonst über dem
    // „Fertig"-Button und fängt den Klick ab.
    await expect(page.getByText('Strich wurde storniert.')).toBeHidden({ timeout: 10_000 });

    // „Fertig" führt zurück zur Mitgliederübersicht.
    await page.getByRole('button', { name: 'Fertig' }).click();
    await expect(page.getByRole('heading', { name: 'Aktive' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bernd Beispiel' })).toBeVisible();
  });

  test('normales Mitglied sieht die eigene Stube, nicht die Theken-Übersicht', async ({ page }) => {
    await loginViaUi(page, 'bernd', TEST_PASSWORDS.bernd);
    await expect(page).toHaveURL(/\/buchen$/);

    // Keine Kategorie-Überschriften — direkt die eigenen Getränke-Buttons.
    await expect(page.getByRole('button', { name: /^Wasser buchen,/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alte Herren' })).toHaveCount(0);
  });
});
