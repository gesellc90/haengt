import { test, expect, request as apiRequest } from '@playwright/test';
import { loginViaUi, TEST_PASSWORDS } from '../helpers.js';

const apiBase = (): string => `http://127.0.0.1:${process.env['E2E_BACKEND_PORT'] ?? 3101}`;

test.describe('Admin: Mitglied anlegen → Login als neuer User', () => {
  test('Admin legt „carla" an, danach kann sich carla einloggen', async ({ page, browser }) => {
    const newUsername = `carla-${Date.now()}`;
    const newPassword = 'carla-passwort-123';

    // Admin-Login + Mitglied anlegen via API. Die UI wird im zweiten
    // Schritt für den eigentlichen Login-Flow geprüft.
    const admin = await apiRequest.newContext({ baseURL: apiBase() });
    const adminLogin = await admin.post('/api/v1/auth/login', {
      data: { username: 'admin', password: TEST_PASSWORDS.admin },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const { token: adminToken } = (await adminLogin.json()) as { token: string };

    const create = await admin.post('/api/v1/members', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        username: newUsername,
        display_name: 'Carla Test',
        password: newPassword,
        role: 'member',
      },
    });
    expect(create.status(), `Anlage von ${newUsername} fehlgeschlagen`).toBe(201);
    await admin.dispose();

    // Optional: Admin-Mitgliederseite in der UI gegenprüfen.
    await loginViaUi(page, 'admin', TEST_PASSWORDS.admin);
    await page.goto('/admin/mitglieder');
    await expect(page.getByText(newUsername)).toBeVisible({ timeout: 5_000 });

    // Frische Session in einem neuen Context, damit das vorhandene
    // admin-Token nicht stört.
    const fresh = await browser.newContext();
    const freshPage = await fresh.newPage();
    await loginViaUi(freshPage, newUsername, newPassword);
    await expect(freshPage).toHaveURL(/\/buchen$/);
    await fresh.close();
  });
});
