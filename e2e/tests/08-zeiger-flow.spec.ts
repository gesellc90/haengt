import { test, expect, request as apiRequest } from '@playwright/test';
import { loginViaApi, loginViaUi, TEST_PASSWORDS } from '../helpers.js';

const apiBase = (): string => `http://127.0.0.1:${process.env['E2E_BACKEND_PORT'] ?? 3101}`;

// ---------------------------------------------------------------------------
// Zeiger-Flow: öffnen → buchen → schließen
// ---------------------------------------------------------------------------

test.describe('Zeiger-Flow', () => {
  test('Admin öffnet Zeiger, Anna bucht darauf, Admin schließt ihn', async ({ page, browser }) => {
    const apiCtx = await apiRequest.newContext();

    // 1. Admin legt Zeiger via API an
    await loginViaApi(apiCtx, page, 'admin', TEST_PASSWORDS.admin);
    const createRes = await apiCtx.post(`${apiBase()}/api/v1/zeiger`, {
      data: { titel: 'E2E-Testzeiger', art: 'veranstaltung' },
    });
    expect(createRes.ok(), 'Zeiger anlegen sollte 201 liefern').toBeTruthy();
    const zeiger = (await createRes.json()) as { id: number; status: string };
    expect(zeiger.status).toBe('offen');

    // 2. Anna meldet sich an und navigiert zur Zeiger-Liste
    const annaPage = await browser.newPage();
    await loginViaUi(annaPage, 'anna', TEST_PASSWORDS.anna);
    await annaPage.goto('/zeiger');
    await expect(annaPage.getByText('E2E-Testzeiger')).toBeVisible({ timeout: 5_000 });

    // 3. Anna öffnet die Detail-Seite und bucht ein Getränk
    await annaPage.getByText('E2E-Testzeiger').click();
    await expect(annaPage).toHaveURL(/\/zeiger\/\d+/);
    await expect(annaPage.getByRole('heading', { name: /Strich setzen/i })).toBeVisible();

    // Erstes verfügbares Getränk buchen
    const firstDrink = annaPage.getByRole('button', { name: /buchen,/i }).first();
    await expect(firstDrink).toBeVisible();
    await firstDrink.click();

    // Toast oder Buchungseintrag soll erscheinen
    await expect(annaPage.getByRole('list').getByRole('listitem').first()).toBeVisible({
      timeout: 5_000,
    });

    await annaPage.close();

    // 4. Admin schließt den Zeiger
    await page.goto(`/zeiger/${zeiger.id}`);
    await expect(page.getByRole('button', { name: /Zeiger schließen/i })).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole('button', { name: /Zeiger schließen/i }).click();

    // Status-Badge soll auf „Geschlossen" wechseln
    await expect(page.getByText('Geschlossen')).toBeVisible({ timeout: 5_000 });

    // 5. Auf einem geschlossenen Zeiger sind keine Buchungen mehr möglich
    await expect(page.getByRole('heading', { name: /Strich setzen/i })).not.toBeVisible();

    await apiCtx.dispose();
  });

  test('Buchen auf geschlossenen Zeiger schlägt fehl (409 via API)', async () => {
    const apiCtx = await apiRequest.newContext();

    // Admin-Login
    const loginRes = await apiCtx.post(`${apiBase()}/api/v1/auth/login`, {
      data: { username: 'admin', password: TEST_PASSWORDS.admin },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = (await loginRes.json()) as { token: string };
    const headers = { Authorization: `Bearer ${token}` };

    // Zeiger anlegen und sofort schließen
    const createRes = await apiCtx.post(`${apiBase()}/api/v1/zeiger`, {
      headers,
      data: { titel: 'Bereits geschlossen', art: 'besuch' },
    });
    const { id } = (await createRes.json()) as { id: number };
    await apiCtx.post(`${apiBase()}/api/v1/zeiger/${id}/close`, { headers, data: {} });

    // Getränk-ID ermitteln
    const drinksRes = await apiCtx.get(`${apiBase()}/api/v1/drinks`, { headers });
    const drinks = (await drinksRes.json()) as Array<{ id: number }>;
    const drinkId = drinks[0]?.id ?? 1;

    // Buchung auf geschlossenen Zeiger → 409
    const bookRes = await apiCtx.post(`${apiBase()}/api/v1/bookings`, {
      headers,
      data: { drink_id: drinkId, zeiger_id: id },
    });
    expect(bookRes.status()).toBe(409);

    await apiCtx.dispose();
  });
});
