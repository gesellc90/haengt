import { describe, it, expect } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { createApp } from '../../src/app.js';

const silentLogger = pino({ level: 'silent' });

describe('GET /api/v1/health', () => {
  const app = createApp({ logger: silentLogger });

  it('antwortet mit 200 und Status "ok"', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.uptime).toBe('number');
    expect(() => new Date(res.body.timestamp).toISOString()).not.toThrow();
  });
});
