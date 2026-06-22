/**
 * Integrationstests für die Members-Endpunkte.
 *
 * Getestete Szenarien:
 *  - GET  /members:        Auth-Guard (401/403), Liste aktiver und inaktiver Mitglieder
 *  - POST /members:        Mitglied anlegen (happy path), doppelter Username (409),
 *                          Validierungsfehler (400), unerlaubte Rolle (403)
 *  - GET  /members/:id:    Einzelabruf, unbekannte ID (404), ungültige ID (400)
 *  - PATCH /members/:id:   Display-Name ändern, Passwort ändern, unbekannte ID (404)
 *  - DELETE /members/:id:  Soft-Delete, Selbst-Deaktivierung (400), unbekannte ID (404)
 *
 * Jeder Block bekommt eine frische In-Memory-DB mit Migrationen + Stammdaten.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { createTestDb } from '../unit/db/helpers.js';
import { MembersRepo } from '../../src/db/repos/MembersRepo.js';
import type { Db } from '../../src/db/client.js';

const silentLogger = pino({ level: 'silent' });
const TEST_JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

const testEnv = {
  NODE_ENV: 'test' as const,
  PORT: 3001,
  LOG_LEVEL: 'silent' as const,
  DB_PATH: ':memory:',
  JWT_SECRET: TEST_JWT_SECRET,
  JWT_EXPIRES_IN: '8h',
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

async function setupApp(): Promise<{ app: Express; db: Db }> {
  const db = createTestDb();
  const membersRepo = new MembersRepo(db);
  const passwordHash = await bcrypt.hash('geheim123', 10);

  membersRepo.create({
    username: 'admin',
    display_name: 'Administrator',
    password_hash: passwordHash,
    role: 'admin',
  });

  membersRepo.create({
    username: 'alice',
    display_name: 'Alice Muster',
    password_hash: passwordHash,
    role: 'member',
  });

  const app = createApp({ logger: silentLogger, db, env: testEnv });
  return { app, db };
}

async function getToken(app: Express, username: string, password = 'geheim123'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ username, password });
  return res.body.token as string;
}

// ---------------------------------------------------------------------------
// GET /members
// ---------------------------------------------------------------------------

describe('GET /api/v1/members', () => {
  let app: Express;

  beforeEach(async () => {
    ({ app } = await setupApp());
  });

  it('gibt 401 ohne Token zurück', async () => {
    const res = await request(app).get('/api/v1/members');
    expect(res.status).toBe(401);
  });

  it('gibt 403 für ein normales Mitglied zurück', async () => {
    const token = await getToken(app, 'alice');
    const res = await request(app).get('/api/v1/members').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('gibt die aktiven Mitglieder als Admin zurück', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app).get('/api/v1/members').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    // Kein password_hash in der Antwort
    expect(res.body[0]).not.toHaveProperty('password_hash');
  });

  it('gibt auch inaktive Mitglieder zurück wenn includeInactive=true', async () => {
    // alice deaktivieren
    const token = await getToken(app, 'admin');
    await request(app).delete('/api/v1/members/2').set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/v1/members?includeInactive=true')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const alice = res.body.find((m: { username: string }) => m.username === 'alice');
    expect(alice.is_active).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// POST /members
// ---------------------------------------------------------------------------

describe('POST /api/v1/members', () => {
  let app: Express;

  beforeEach(async () => {
    ({ app } = await setupApp());
  });

  it('legt ein neues Mitglied an (happy path)', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'bob',
        display_name: 'Bob Beispiel',
        password: 'sicheresPasswort1',
        role: 'member',
      });

    expect(res.status).toBe(201);
    expect(res.body.username).toBe('bob');
    expect(res.body.display_name).toBe('Bob Beispiel');
    expect(res.body.role).toBe('member');
    expect(res.body.is_active).toBe(1);
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('legt ein Mitglied mit member_status an', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'altherr',
        display_name: 'Alter Herr',
        password: 'sicheresPasswort1',
        member_status: 'alter_herr',
      });

    expect(res.status).toBe(201);
    expect(res.body.member_status).toBe('alter_herr');
    expect(res.body.can_book_for_others).toBe(0);
  });

  it('setzt member_status=aktiv als Default wenn nicht angegeben', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'ohnestatus',
        display_name: 'Ohne Status',
        password: 'sicheresPasswort1',
      });

    expect(res.status).toBe(201);
    expect(res.body.member_status).toBe('aktiv');
  });

  it('legt einen Admin an', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'zweiteradmin',
        display_name: 'Zweiter Admin',
        password: 'sicheresPasswort1',
        role: 'admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('admin');
  });

  it('gibt 409 bei doppeltem Username zurück', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'alice', // bereits vorhanden
        display_name: 'Alice Duplikat',
        password: 'sicheresPasswort1',
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('USERNAME_TAKEN');
  });

  it('gibt 400 bei zu kurzem Passwort zurück', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'charlie',
        display_name: 'Charlie',
        password: 'kurz', // < 8 Zeichen
      });

    expect(res.status).toBe(400);
  });

  it('gibt 400 bei ungültigem Username zurück', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'charlie mit leerzeichen',
        display_name: 'Charlie',
        password: 'sicheresPasswort1',
      });

    expect(res.status).toBe(400);
  });

  it('gibt 403 zurück wenn kein Admin', async () => {
    const token = await getToken(app, 'alice');
    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'bob',
        display_name: 'Bob',
        password: 'sicheresPasswort1',
      });

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// GET /members/:id
// ---------------------------------------------------------------------------

describe('GET /api/v1/members/:id', () => {
  let app: Express;

  beforeEach(async () => {
    ({ app } = await setupApp());
  });

  it('gibt ein einzelnes Mitglied zurück', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app).get('/api/v1/members/2').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('gibt 404 für unbekannte ID zurück', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .get('/api/v1/members/9999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('gibt 400 für ungültige ID zurück', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .get('/api/v1/members/abc')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /members/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/members/:id', () => {
  let app: Express;

  beforeEach(async () => {
    ({ app } = await setupApp());
  });

  it('aktualisiert den Display-Namen', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .patch('/api/v1/members/2')
      .set('Authorization', `Bearer ${token}`)
      .send({ display_name: 'Alice Geändert' });

    expect(res.status).toBe(200);
    expect(res.body.display_name).toBe('Alice Geändert');
  });

  it('aktualisiert die Rolle', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .patch('/api/v1/members/2')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  it('ändert das Passwort (Login danach möglich)', async () => {
    const token = await getToken(app, 'admin');
    await request(app)
      .patch('/api/v1/members/2')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'neuesPasswort99' });

    // Login mit neuem Passwort muss klappen
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'alice', password: 'neuesPasswort99' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
  });

  it('aktualisiert member_status und can_book_for_others', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .patch('/api/v1/members/2')
      .set('Authorization', `Bearer ${token}`)
      .send({ member_status: 'inaktiv', can_book_for_others: true });

    expect(res.status).toBe(200);
    expect(res.body.member_status).toBe('inaktiv');
    expect(res.body.can_book_for_others).toBe(1);
  });

  it('gibt 400 bei ungültigem member_status zurück', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .patch('/api/v1/members/2')
      .set('Authorization', `Bearer ${token}`)
      .send({ member_status: 'kein-status' });

    expect(res.status).toBe(400);
  });

  it('gibt 404 für unbekannte ID zurück', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .patch('/api/v1/members/9999')
      .set('Authorization', `Bearer ${token}`)
      .send({ display_name: 'Ghost' });

    expect(res.status).toBe(404);
  });

  it('gibt 400 für leeren Body zurück', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .patch('/api/v1/members/2')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /members/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/members/:id', () => {
  let app: Express;

  beforeEach(async () => {
    ({ app } = await setupApp());
  });

  it('deaktiviert ein Mitglied (Soft-Delete)', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .delete('/api/v1/members/2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    // Mitglied ist nun inaktiv → Login schlägt fehl
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'alice', password: 'geheim123' });
    expect(loginRes.status).toBe(401);
    expect(loginRes.body.code).toBe('ACCOUNT_INACTIVE');
  });

  it('gibt 400 beim Versuch das eigene Konto zu deaktivieren', async () => {
    const token = await getToken(app, 'admin');
    // admin hat ID 1
    const res = await request(app)
      .delete('/api/v1/members/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SELF_DEACTIVATION');
  });

  it('gibt 404 für unbekannte ID zurück', async () => {
    const token = await getToken(app, 'admin');
    const res = await request(app)
      .delete('/api/v1/members/9999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('gibt 409 wenn Mitglied bereits inaktiv ist', async () => {
    const token = await getToken(app, 'admin');
    await request(app).delete('/api/v1/members/2').set('Authorization', `Bearer ${token}`);

    // Nochmals löschen
    const res = await request(app)
      .delete('/api/v1/members/2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALREADY_INACTIVE');
  });
});

// ---------------------------------------------------------------------------
// GET /members/bookable (M9 — Theken-/Allgemein-Konto)
// ---------------------------------------------------------------------------

describe('GET /api/v1/members/bookable', () => {
  let app: Express;
  let db: Db;

  beforeEach(async () => {
    ({ app, db } = await setupApp());
    const membersRepo = new MembersRepo(db);
    const passwordHash = await bcrypt.hash('geheim123', 10);
    membersRepo.create({
      username: 'allgemein',
      display_name: 'Allgemein',
      password_hash: passwordHash,
      role: 'member',
      can_book_for_others: 1,
    });
    membersRepo.create({
      username: 'freund',
      display_name: 'Freund Franz',
      role: 'member',
      member_status: 'freund',
    });
  });

  it('Allgemein-Konto erhält die bebuchbaren Mitglieder', async () => {
    const token = await getToken(app, 'allgemein');
    const res = await request(app)
      .get('/api/v1/members/bookable')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // alice + freund sind bebuchbar; admin und das Allgemein-Konto selbst nicht
    const usernames = (res.body as Array<{ username: string }>).map((m) => m.username);
    expect(usernames).toContain('alice');
    expect(usernames).toContain('freund');
    expect(usernames).not.toContain('admin');
    expect(usernames).not.toContain('allgemein');
  });

  it('normales Mitglied erhält 403', async () => {
    const token = await getToken(app, 'alice');
    const res = await request(app)
      .get('/api/v1/members/bookable')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('gibt 401 ohne Token zurück', async () => {
    const res = await request(app).get('/api/v1/members/bookable');
    expect(res.status).toBe(401);
  });
});
