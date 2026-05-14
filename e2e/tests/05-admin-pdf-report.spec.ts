import { test, expect, request as apiRequest } from '@playwright/test';
import { TEST_PASSWORDS } from '../helpers.js';

const apiBase = (): string => `http://127.0.0.1:${process.env['E2E_BACKEND_PORT'] ?? 3101}`;

test.describe('Admin: PDF-Report herunterladen', () => {
  test('PDF-Antwort beginnt mit %PDF- und hat Content-Type application/pdf', async () => {
    const ctx = await apiRequest.newContext({ baseURL: apiBase() });

    const login = await ctx.post('/api/v1/auth/login', {
      data: { username: 'admin', password: TEST_PASSWORDS.admin },
    });
    expect(login.ok()).toBeTruthy();
    const { token } = (await login.json()) as { token: string };

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1; // 1-12

    const pdf = await ctx.get(`/api/v1/reports/monthly?year=${year}&month=${month}&format=pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(pdf.status(), 'Erwartet 200 OK für PDF-Report').toBe(200);

    const ct = pdf.headers()['content-type'] ?? '';
    expect(ct).toContain('application/pdf');

    const body = await pdf.body();
    // Spec-Requirement: Response beginnt mit "%PDF-"
    const magic = body.subarray(0, 5).toString('ascii');
    expect(magic).toBe('%PDF-');
    // Eine PDF-Datei hat eine sinnvolle Mindestgröße — < 500 Byte ist verdächtig.
    expect(body.byteLength).toBeGreaterThan(500);

    await ctx.dispose();
  });
});
