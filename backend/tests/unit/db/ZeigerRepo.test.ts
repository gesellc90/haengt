import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Db } from '../../../src/db/client.js';
import { MembersRepo } from '../../../src/db/repos/MembersRepo.js';
import { VerbindungenRepo } from '../../../src/db/repos/VerbindungenRepo.js';
import { ZeigerRepo } from '../../../src/db/repos/ZeigerRepo.js';
import { createTestDb } from './helpers.js';

describe('VerbindungenRepo', () => {
  let db: Db;
  let repo: VerbindungenRepo;

  beforeEach(() => {
    db = createTestDb();
    repo = new VerbindungenRepo(db);
  });

  afterEach(() => db.close());

  it('legt eine Verbindung an und gibt sie zurück', () => {
    const v = repo.create({ name: 'Saxonia', zirkel: 'Sax.', ort: 'Musterstadt' });
    expect(v.id).toBeGreaterThan(0);
    expect(v.name).toBe('Saxonia');
    expect(v.zirkel).toBe('Sax.');
    expect(v.ort).toBe('Musterstadt');
    expect(v.active).toBe(1);
  });

  it('legt ohne optionale Felder an', () => {
    const v = repo.create({ name: 'Minimal' });
    expect(v.zirkel).toBeNull();
    expect(v.ort).toBeNull();
  });

  it('findAll liefert nur aktive Verbindungen (Default)', () => {
    const v1 = repo.create({ name: 'Aktiv' });
    const v2 = repo.create({ name: 'Inaktiv' });
    repo.deactivate(v2.id);

    const all = repo.findAll();
    expect(all.map((v) => v.id)).toContain(v1.id);
    expect(all.map((v) => v.id)).not.toContain(v2.id);
  });

  it('findAll(true) liefert auch inaktive Verbindungen', () => {
    const v = repo.create({ name: 'Test' });
    repo.deactivate(v.id);

    const all = repo.findAll(true);
    expect(all.some((x) => x.id === v.id)).toBe(true);
  });

  it('update ändert nur übergebene Felder', () => {
    const v = repo.create({ name: 'Alt', zirkel: 'Alt.', ort: 'Altstadt' });
    const updated = repo.update(v.id, { name: 'Neu' });
    expect(updated?.name).toBe('Neu');
    expect(updated?.zirkel).toBe('Alt.');
    expect(updated?.ort).toBe('Altstadt');
  });

  it('update gibt undefined zurück bei unbekannter ID', () => {
    expect(repo.update(999, { name: 'X' })).toBeUndefined();
  });

  it('deactivate gibt false zurück bei unbekannter ID', () => {
    expect(repo.deactivate(999)).toBe(false);
  });
});

describe('ZeigerRepo', () => {
  let db: Db;
  let repo: ZeigerRepo;
  let memberId: number;

  beforeEach(() => {
    db = createTestDb();
    repo = new ZeigerRepo(db);
    const membersRepo = new MembersRepo(db);
    const m = membersRepo.create({ username: 'tester', display_name: 'Tester' });
    memberId = m.id;
  });

  afterEach(() => db.close());

  it('legt einen Zeiger an und gibt ihn zurück', () => {
    const z = repo.create({
      titel: 'Couleurbesuch Saxonia',
      art: 'besuch',
      created_by: memberId,
      anzahl_bundesbrueder: 5,
      anzahl_gaeste: 2,
    });

    expect(z.id).toBeGreaterThan(0);
    expect(z.titel).toBe('Couleurbesuch Saxonia');
    expect(z.art).toBe('besuch');
    expect(z.status).toBe('offen');
    expect(z.anzahl_bundesbrueder).toBe(5);
    expect(z.anzahl_gaeste).toBe(2);
    expect(z.closed_at).toBeNull();
    expect(z.verbindung_id).toBeNull();
  });

  it('legt einen Veranstaltungs-Zeiger an', () => {
    const z = repo.create({ titel: 'Kneipabend', art: 'veranstaltung', created_by: memberId });
    expect(z.art).toBe('veranstaltung');
    expect(z.anzahl_bundesbrueder).toBe(0);
  });

  it('verknüpft eine Verbindung', () => {
    const vRepo = new VerbindungenRepo(db);
    const v = vRepo.create({ name: 'Saxonia' });

    const z = repo.create({
      titel: 'Besuch',
      art: 'besuch',
      verbindung_id: v.id,
      created_by: memberId,
    });
    expect(z.verbindung_id).toBe(v.id);
  });

  it('findAll ohne Filter liefert alle Zeiger', () => {
    repo.create({ titel: 'Z1', art: 'besuch', created_by: memberId });
    repo.create({ titel: 'Z2', art: 'veranstaltung', created_by: memberId });
    expect(repo.findAll().length).toBe(2);
  });

  it('findAll("offen") liefert nur offene Zeiger', () => {
    const z1 = repo.create({ titel: 'Offen', art: 'besuch', created_by: memberId });
    const z2 = repo.create({ titel: 'Geschlossen', art: 'besuch', created_by: memberId });
    repo.update(z2.id, {
      status: 'geschlossen',
      closed_at: new Date().toISOString(),
      closed_by: memberId,
    });

    const offen = repo.findAll('offen');
    expect(offen.map((z) => z.id)).toContain(z1.id);
    expect(offen.map((z) => z.id)).not.toContain(z2.id);
  });

  it('update schließt einen Zeiger', () => {
    const z = repo.create({ titel: 'Test', art: 'besuch', created_by: memberId });
    const closedAt = new Date().toISOString();
    const updated = repo.update(z.id, {
      status: 'geschlossen',
      closed_at: closedAt,
      closed_by: memberId,
    });

    expect(updated?.status).toBe('geschlossen');
    expect(updated?.closed_at).toBe(closedAt);
    expect(updated?.closed_by).toBe(memberId);
  });

  it('update ändert BBr/Gäste-Zahlen', () => {
    const z = repo.create({
      titel: 'Test',
      art: 'besuch',
      created_by: memberId,
      anzahl_bundesbrueder: 3,
      anzahl_gaeste: 1,
    });
    const updated = repo.update(z.id, { anzahl_bundesbrueder: 8, anzahl_gaeste: 4 });
    expect(updated?.anzahl_bundesbrueder).toBe(8);
    expect(updated?.anzahl_gaeste).toBe(4);
  });

  it('update gibt undefined zurück bei unbekannter ID', () => {
    expect(repo.update(999, { anzahl_gaeste: 1 })).toBeUndefined();
  });

  it('findById gibt undefined für unbekannte ID zurück', () => {
    expect(repo.findById(999)).toBeUndefined();
  });
});
