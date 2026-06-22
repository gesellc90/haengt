import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Db } from '../../../src/db/client.js';
import { MembersRepo } from '../../../src/db/repos/MembersRepo.js';
import { createTestDb } from './helpers.js';

describe('MembersRepo', () => {
  let db: Db;
  let repo: MembersRepo;

  beforeEach(() => {
    db = createTestDb();
    repo = new MembersRepo(db);
  });

  afterEach(() => {
    db.close();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create', () => {
    it('legt ein Mitglied an und gibt es zurück', () => {
      const member = repo.create({
        username: 'testuser',
        display_name: 'Test User',
      });

      expect(member.id).toBeGreaterThan(0);
      expect(member.username).toBe('testuser');
      expect(member.display_name).toBe('Test User');
      expect(member.role).toBe('member');
      expect(member.is_active).toBe(1);
      expect(member.password_hash).toBeNull();
    });

    it('kann einen Admin anlegen', () => {
      const admin = repo.create({
        username: 'admin',
        display_name: 'Admin',
        role: 'admin',
      });
      expect(admin.role).toBe('admin');
    });

    it('schlägt bei doppeltem username fehl', () => {
      repo.create({ username: 'dupe', display_name: 'Eins' });
      expect(() => repo.create({ username: 'dupe', display_name: 'Zwei' })).toThrow();
    });

    it('setzt member_status=aktiv und can_book_for_others=0 als Default', () => {
      const member = repo.create({ username: 'defaults', display_name: 'Defaults' });
      expect(member.member_status).toBe('aktiv');
      expect(member.can_book_for_others).toBe(0);
    });

    it('übernimmt member_status und can_book_for_others', () => {
      const member = repo.create({
        username: 'theke',
        display_name: 'Allgemein',
        member_status: 'freund',
        can_book_for_others: 1,
      });
      expect(member.member_status).toBe('freund');
      expect(member.can_book_for_others).toBe(1);
    });

    it('lehnt einen ungültigen member_status ab (CHECK-Constraint)', () => {
      expect(() =>
        repo.create({
          username: 'kaputt',
          display_name: 'Kaputt',
          // @ts-expect-error – absichtlich ungültiger Wert für den DB-CHECK
          member_status: 'unbekannt',
        }),
      ).toThrow();
    });

    it('username-Vergleich ist case-insensitive (UNIQUE COLLATE NOCASE)', () => {
      repo.create({ username: 'Anna', display_name: 'Anna' });
      expect(() => repo.create({ username: 'ANNA', display_name: 'Anna2' })).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // findById / findByUsername
  // ---------------------------------------------------------------------------

  describe('findById', () => {
    it('gibt undefined zurück wenn nicht gefunden', () => {
      expect(repo.findById(999)).toBeUndefined();
    });

    it('findet ein vorhandenes Mitglied', () => {
      const created = repo.create({ username: 'foo', display_name: 'Foo' });
      expect(repo.findById(created.id)).toMatchObject({ username: 'foo' });
    });
  });

  describe('findByUsername', () => {
    it('gibt undefined zurück wenn nicht gefunden', () => {
      expect(repo.findByUsername('nobody')).toBeUndefined();
    });

    it('findet case-insensitiv', () => {
      repo.create({ username: 'Klaus', display_name: 'Klaus' });
      expect(repo.findByUsername('KLAUS')).toBeDefined();
      expect(repo.findByUsername('klaus')).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------

  describe('findAll', () => {
    it('gibt nur aktive Mitglieder zurück (default)', () => {
      const m1 = repo.create({ username: 'aktiv', display_name: 'Aktiv' });
      const m2 = repo.create({ username: 'inaktiv', display_name: 'Inaktiv' });
      repo.deactivate(m2.id);

      const all = repo.findAll();
      expect(all.some((m) => m.id === m1.id)).toBe(true);
      expect(all.some((m) => m.id === m2.id)).toBe(false);
    });

    it('gibt alle Mitglieder zurück wenn includeInactive=true', () => {
      const m = repo.create({ username: 'inaktiv2', display_name: 'Inaktiv2' });
      repo.deactivate(m.id);

      const all = repo.findAll(true);
      expect(all.some((x) => x.id === m.id)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    it('aktualisiert display_name', () => {
      const m = repo.create({ username: 'upd', display_name: 'Alt' });
      const updated = repo.update(m.id, { display_name: 'Neu' });
      expect(updated?.display_name).toBe('Neu');
    });

    it('aktualisiert password_hash', () => {
      const m = repo.create({ username: 'pw', display_name: 'PW' });
      const updated = repo.update(m.id, { password_hash: '$2b$10$fakeHash' });
      expect(updated?.password_hash).toBe('$2b$10$fakeHash');
    });

    it('gibt undefined zurück wenn id nicht existiert', () => {
      expect(repo.update(999, { display_name: 'X' })).toBeUndefined();
    });

    it('lässt nicht angegebene Felder unverändert', () => {
      const m = repo.create({ username: 'partial', display_name: 'Orig', role: 'admin' });
      const updated = repo.update(m.id, { display_name: 'Geändert' });
      expect(updated?.role).toBe('admin');
    });

    it('aktualisiert member_status und can_book_for_others', () => {
      const m = repo.create({ username: 'cat', display_name: 'Kat' });
      const updated = repo.update(m.id, { member_status: 'inaktiv', can_book_for_others: 1 });
      expect(updated?.member_status).toBe('inaktiv');
      expect(updated?.can_book_for_others).toBe(1);
    });

    it('lässt member_status/can_book_for_others unverändert wenn nicht angegeben', () => {
      const m = repo.create({
        username: 'keep',
        display_name: 'Keep',
        member_status: 'alter_herr',
        can_book_for_others: 1,
      });
      const updated = repo.update(m.id, { display_name: 'Neu' });
      expect(updated?.member_status).toBe('alter_herr');
      expect(updated?.can_book_for_others).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // findBookable
  // ---------------------------------------------------------------------------

  describe('findBookable', () => {
    it('liefert nur aktive Members ohne Buchen-für-andere-Recht', () => {
      const aktiv = repo.create({ username: 'a', display_name: 'Aktiv', member_status: 'aktiv' });
      const admin = repo.create({ username: 'adm', display_name: 'Admin', role: 'admin' });
      const theke = repo.create({
        username: 'theke',
        display_name: 'Allgemein',
        can_book_for_others: 1,
      });
      const inaktivKonto = repo.create({ username: 'weg', display_name: 'Weg' });
      repo.deactivate(inaktivKonto.id);

      const ids = repo.findBookable().map((m) => m.id);
      expect(ids).toContain(aktiv.id);
      expect(ids).not.toContain(admin.id);
      expect(ids).not.toContain(theke.id);
      expect(ids).not.toContain(inaktivKonto.id);
    });

    it('sortiert nach Kategorie (Aktive → Inaktive → Alte Herren → Freunde)', () => {
      repo.create({ username: 'f', display_name: 'Freund', member_status: 'freund' });
      repo.create({ username: 'ah', display_name: 'AlterHerr', member_status: 'alter_herr' });
      repo.create({ username: 'ak', display_name: 'Aktiver', member_status: 'aktiv' });
      repo.create({ username: 'in', display_name: 'Inaktiver', member_status: 'inaktiv' });

      const stati = repo.findBookable().map((m) => m.member_status);
      expect(stati).toEqual(['aktiv', 'inaktiv', 'alter_herr', 'freund']);
    });
  });

  // ---------------------------------------------------------------------------
  // deactivate
  // ---------------------------------------------------------------------------

  describe('deactivate', () => {
    it('setzt is_active = 0', () => {
      const m = repo.create({ username: 'gone', display_name: 'Gone' });
      expect(repo.deactivate(m.id)).toBe(true);
      expect(repo.findById(m.id)?.is_active).toBe(0);
    });

    it('gibt false zurück wenn id nicht existiert', () => {
      expect(repo.deactivate(9999)).toBe(false);
    });
  });
});
