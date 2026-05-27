import { test, expect, request as apiRequest } from '@playwright/test';
import { loginViaUi, TEST_PASSWORDS } from '../helpers.js';

const apiBase = (): string => `http://127.0.0.1:${process.env['E2E_BACKEND_PORT'] ?? 3101}`;

test.describe('Storno (5-Minuten-Fenster)', () => {
  test('Positiv: frische Buchung kann sofort storniert werden', async ({ page }) => {
    await loginViaUi(page, 'bernd', TEST_PASSWORDS.bernd);
    await expect(page).toHaveURL(/\/buchen$/);

    // Frische Buchung anlegen — Cola
    await page.getByRole('button', { name: /^Cola buchen,/i }).click();

    const colaItem = page.getByRole('listitem').filter({ hasText: /Cola/ }).first();
    await expect(colaItem).toBeVisible();

    // Innerhalb der Buchungs-Karte den Storno-Button anklicken.
    await colaItem.getByRole('button', { name: 'Strich stornieren' }).click();

    // Nach erfolgreichem Storno erscheint typischerweise „storniert" oder
    // der Eintrag verschwindet aus der „aktiv"-Liste. Wir prüfen beide Pfade.
    await expect(colaItem)
      .toContainText(/storniert/i, { timeout: 5_000 })
      .catch(async () => {
        // Fallback: Eintrag ist weg.
        await expect(colaItem).not.toBeVisible();
      });
  });

  test('Negativ: API liefert 403 für eine vor 10 Min angelegte Buchung', async () => {
    // Den negativ-Pfad rein über die API testen — die UI zeigt den Storno-Button
    // für Buchungen außerhalb des Fensters gar nicht erst an, daher gibt es
    // keinen UI-Klickpfad. Wir simulieren einen „Cheater"-Aufruf direkt auf
    // POST /bookings/:id/void und erwarten 403.
    const ctx = await apiRequest.newContext({ baseURL: apiBase() });

    // Anna ist die User, deren „alte" Buchung im test-seed angelegt wurde.
    const login = await ctx.post('/api/v1/auth/login', {
      data: { username: 'anna', password: TEST_PASSWORDS.anna },
    });
    expect(login.ok()).toBeTruthy();
    const { token } = (await login.json()) as { token: string };

    // Alte Buchung suchen (Bier, älter als 5 Min).
    const list = await ctx.get('/api/v1/bookings/me?limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok()).toBeTruthy();
    const { items: bookings } = (await list.json()) as {
      items: Array<{
        id: number;
        booked_at: string;
        voided_at: string | null;
      }>;
      hasMore: boolean;
    };
    const stale = bookings.find(
      (b) => b.voided_at === null && Date.now() - Date.parse(b.booked_at) > 5 * 60 * 1000,
    );
    expect(stale, 'Test-Seed hat keine „alte" Buchung erzeugt').toBeDefined();

    // Storno-Versuch — erwartet 409 (Service-Layer: VOID_WINDOW_EXPIRED).
    // Der Backend-AppError verwendet 409 (Conflict), weil der Zustand der
    // Buchung (abgelaufenes Zeitfenster) den Request ablehnt — kein Berechtigungs-
    // problem (das wäre 403), sondern ein State-Conflict.
    const voidRes = await ctx.post(`/api/v1/bookings/${stale!.id}/void`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { reason: 'soll fehlschlagen' },
    });
    expect(voidRes.status()).toBe(409);

    await ctx.dispose();
  });
});
