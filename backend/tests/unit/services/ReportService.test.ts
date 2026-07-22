/**
 * Unit-Tests für ReportService.
 *
 * Getestete Szenarien:
 *  - calculateMonthly: Aggregation, Monatsgrenze, stornierte Buchungen ignoriert
 *  - calculateMonthly: AppError(404) bei unbekanntem Mitglied
 *  - calculateAllMembers: Alle aktiven Mitglieder werden einbezogen
 *  - monthBounds: Korrekte Europe/Berlin-Grenzen inkl. Jahreswechsel & DST
 */

import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { createTestDb } from '../db/helpers.js';
import { MembersRepo } from '../../../src/db/repos/MembersRepo.js';
import { DrinksRepo } from '../../../src/db/repos/DrinksRepo.js';
import { BookingsRepo } from '../../../src/db/repos/BookingsRepo.js';
import { ZeigerRepo } from '../../../src/db/repos/ZeigerRepo.js';
import { VerbindungenRepo } from '../../../src/db/repos/VerbindungenRepo.js';
import { ReportService, monthBounds } from '../../../src/services/ReportService.js';
import { AppError } from '../../../src/middleware/errorHandler.js';
import type { Db } from '../../../src/db/client.js';

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

async function setup() {
  const db: Db = createTestDb();
  const membersRepo = new MembersRepo(db);
  const drinksRepo = new DrinksRepo(db);
  const bookingsRepo = new BookingsRepo(db);
  const zeigerRepo = new ZeigerRepo(db);
  const verbindungenRepo = new VerbindungenRepo(db);
  const reportService = new ReportService(bookingsRepo, membersRepo, zeigerRepo, verbindungenRepo);

  const hash = await bcrypt.hash('pw', 10);
  const alice = membersRepo.create({
    username: 'alice',
    display_name: 'Alice',
    password_hash: hash,
  });
  const bob = membersRepo.create({ username: 'bob', display_name: 'Bob', password_hash: hash });
  // Deaktiviertes Mitglied
  const charlie = membersRepo.create({
    username: 'charlie',
    display_name: 'Charlie',
    password_hash: hash,
  });
  membersRepo.deactivate(charlie.id);

  const cola = drinksRepo.create({ name: 'Cola', categoryId: 1, initialPriceCents: 120 });
  const bier = drinksRepo.create({ name: 'Bier', categoryId: 1, initialPriceCents: 250 });

  return {
    db,
    membersRepo,
    drinksRepo,
    bookingsRepo,
    reportService,
    alice,
    bob,
    charlie,
    cola,
    bier,
  };
}

// ---------------------------------------------------------------------------
// monthBounds-Tests
// ---------------------------------------------------------------------------

describe('monthBounds', () => {
  // Grenzen sind lokale Mitternacht (Europe/Berlin), zurückgegeben als UTC.
  it('gibt Sommerzeit-Grenzen (UTC+2) für Mai 2026 zurück', () => {
    const { from, to } = monthBounds(2026, 5);
    expect(from).toBe('2026-04-30T22:00:00.000Z');
    expect(to).toBe('2026-05-31T22:00:00.000Z');
  });

  it('behandelt Jahreswechsel korrekt (Dezember, Winterzeit UTC+1)', () => {
    const { from, to } = monthBounds(2026, 12);
    expect(from).toBe('2026-11-30T23:00:00.000Z');
    expect(to).toBe('2026-12-31T23:00:00.000Z');
  });

  it('behandelt Januar korrekt (Winterzeit UTC+1)', () => {
    const { from, to } = monthBounds(2026, 1);
    expect(from).toBe('2025-12-31T23:00:00.000Z');
    expect(to).toBe('2026-01-31T23:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// ReportService.calculateMonthly
// ---------------------------------------------------------------------------

describe('ReportService.calculateMonthly', () => {
  it('wirft AppError(404) bei unbekanntem Mitglied', async () => {
    const { reportService } = await setup();
    expect(() => reportService.calculateMonthly(9999, 2026, 5)).toThrow(AppError);
    expect(() => reportService.calculateMonthly(9999, 2026, 5)).toThrowError(
      'Mitglied nicht gefunden',
    );
  });

  it('gibt leeren Report zurück wenn keine Buchungen vorhanden', async () => {
    const { reportService, alice } = await setup();
    const report = reportService.calculateMonthly(alice.id, 2026, 5);

    expect(report.member_id).toBe(alice.id);
    expect(report.member_display_name).toBe('Alice');
    expect(report.year).toBe(2026);
    expect(report.month).toBe(5);
    expect(report.entries).toHaveLength(0);
    expect(report.summary).toHaveLength(0);
    expect(report.grand_total_cents).toBe(0);
  });

  it('aggregiert Buchungen korrekt', async () => {
    const { db, reportService, alice, cola, bier } = await setup();

    // 2 × Cola, 1 × Bier – alle im Mai 2026 (explizite Zeitstempel, datums-unabhängig)
    const insert = db.prepare(
      `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_at)
       VALUES (?, ?, ?, ?)`,
    );
    insert.run(alice.id, cola.id, 120, '2026-05-10T12:00:00.000Z');
    insert.run(alice.id, cola.id, 120, '2026-05-11T12:00:00.000Z');
    insert.run(alice.id, bier.id, 250, '2026-05-12T12:00:00.000Z');

    const report = reportService.calculateMonthly(alice.id, 2026, 5);

    expect(report.entries).toHaveLength(3);
    expect(report.grand_total_cents).toBe(120 + 120 + 250); // 490

    const colaSummary = report.summary.find((s) => s.drink_name === 'Cola');
    expect(colaSummary?.count).toBe(2);
    expect(colaSummary?.total_cents).toBe(240);

    const bierSummary = report.summary.find((s) => s.drink_name === 'Bier');
    expect(bierSummary?.count).toBe(1);
    expect(bierSummary?.total_cents).toBe(250);
  });

  it('ignoriert stornierte Buchungen', async () => {
    const { db, reportService, bookingsRepo, alice, cola } = await setup();

    const result = db
      .prepare(
        `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(alice.id, cola.id, 120, '2026-05-10T12:00:00.000Z');
    bookingsRepo.void(result.lastInsertRowid as number, 'Test-Storno');

    const report = reportService.calculateMonthly(alice.id, 2026, 5);
    expect(report.entries).toHaveLength(0);
    expect(report.grand_total_cents).toBe(0);
  });

  it('berücksichtigt nur Buchungen des angegebenen Monats (Berliner Grenzen)', async () => {
    const { db, reportService, alice, cola } = await setup();

    // Mai 2026 (Sommerzeit, UTC+2): Grenzen [2026-04-30T22:00Z, 2026-05-31T22:00Z).
    const insert = db.prepare(
      `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_at)
       VALUES (?, ?, ?, ?)`,
    );

    // 21:59 UTC = 23:59 Berlin am 30.04. → noch April, darf NICHT auftauchen.
    insert.run(alice.id, cola.id, 120, '2026-04-30T21:59:59.000Z');
    // 22:00 UTC = 00:00 Berlin am 01.05. → erster Mai-Moment, MUSS auftauchen.
    insert.run(alice.id, cola.id, 120, '2026-04-30T22:00:00.000Z');
    // 22:00 UTC = 00:00 Berlin am 01.06. → Juni, darf NICHT auftauchen.
    insert.run(alice.id, cola.id, 120, '2026-05-31T22:00:00.000Z');

    const report = reportService.calculateMonthly(alice.id, 2026, 5);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0]?.booked_at).toBe('2026-04-30T22:00:00.000Z');
  });

  it('bezieht nur Buchungen des angefragten Mitglieds ein', async () => {
    const { db, reportService, alice, bob, cola } = await setup();

    const insert = db.prepare(
      `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_at)
       VALUES (?, ?, ?, ?)`,
    );
    insert.run(alice.id, cola.id, 120, '2026-05-10T12:00:00.000Z');
    insert.run(bob.id, cola.id, 120, '2026-05-10T12:00:00.000Z');

    const report = reportService.calculateMonthly(alice.id, 2026, 5);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0]?.drink_name).toBe('Cola');
  });

  it('sortiert die Summary alphabetisch', async () => {
    const { db, reportService, alice, cola, bier } = await setup();

    const insert = db.prepare(
      `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_at)
       VALUES (?, ?, ?, ?)`,
    );
    insert.run(alice.id, cola.id, 120, '2026-05-10T12:00:00.000Z');
    insert.run(alice.id, bier.id, 250, '2026-05-10T12:00:00.000Z');

    const report = reportService.calculateMonthly(alice.id, 2026, 5);
    const names = report.summary.map((s) => s.drink_name);
    expect(names.length).toBeGreaterThan(0);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'de')));
  });
});

// ---------------------------------------------------------------------------
// ReportService.calculateAllMembers
// ---------------------------------------------------------------------------

describe('ReportService.calculateAllMembers', () => {
  it('gibt Reports für alle aktiven Mitglieder zurück', async () => {
    const { reportService } = await setup();
    // alice + bob sind aktiv, charlie ist deaktiviert
    const reports = reportService.calculateAllMembers(2026, 5);

    const names = reports.map((r) => r.member_display_name).sort();
    expect(names).toEqual(['Alice', 'Bob']);
  });

  it('schließt deaktivierte Mitglieder aus', async () => {
    const { reportService } = await setup();
    const reports = reportService.calculateAllMembers(2026, 5);
    expect(reports.find((r) => r.member_display_name === 'Charlie')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ReportService.calculateConsumption
// ---------------------------------------------------------------------------

describe('ReportService.calculateConsumption', () => {
  it('gruppiert nach Kategorie und aggregiert Anzahl + Umsatz', async () => {
    const { db, reportService, drinksRepo, bookingsRepo, alice, cola } = await setup();

    // Zweite Kategorie „Bier" (sort_order 1) + Getränk „Pils".
    const catBier = db
      .prepare("INSERT INTO drink_categories (name, sort_order) VALUES ('Bier', 1)")
      .run().lastInsertRowid as number;
    const pils = drinksRepo.create({ name: 'Pils', categoryId: catBier, initialPriceCents: 200 });

    const insert = db.prepare(
      `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_at, zeiger_id)
       VALUES (?, ?, ?, ?, ?)`,
    );
    // Cola (Kategorie „Sonstige", sort 0): 2 Personen-Buchungen
    insert.run(alice.id, cola.id, 120, '2026-05-10T12:00:00.000Z', null);
    insert.run(alice.id, cola.id, 120, '2026-05-11T12:00:00.000Z', null);
    // Pils (Kategorie „Bier", sort 1): 1 Personen-Buchung
    insert.run(alice.id, pils.id, 200, '2026-05-12T12:00:00.000Z', null);
    // Storniert → darf nicht zählen
    const voided = insert.run(alice.id, cola.id, 120, '2026-05-13T12:00:00.000Z', null)
      .lastInsertRowid as number;
    bookingsRepo.void(voided, 'Test');

    const report = reportService.calculateConsumption('2026-05-01', '2026-05-31');

    // Reihenfolge folgt sort_order: Sonstige (0) vor Bier (1)
    expect(report.groups.map((g) => g.category_name)).toEqual(['Sonstige', 'Bier']);

    const sonstige = report.groups[0]!;
    expect(sonstige.count).toBe(2);
    expect(sonstige.total_cents).toBe(240);
    expect(sonstige.drinks[0]!.drink_name).toBe('Cola');
    expect(sonstige.drinks[0]!.count).toBe(2);

    const bier = report.groups[1]!;
    expect(bier.count).toBe(1);
    expect(bier.total_cents).toBe(200);

    expect(report.total_count).toBe(3);
    expect(report.grand_total_cents).toBe(440);
  });

  it('schließt Zeiger-Buchungen ein (Gesamtverbrauch)', async () => {
    const { db, reportService, alice, cola } = await setup();

    // Zeiger anlegen
    const zeigerId = db
      .prepare(`INSERT INTO zeiger (titel, art, created_by) VALUES ('Kneipe', 'veranstaltung', ?)`)
      .run(alice.id).lastInsertRowid as number;

    const insert = db.prepare(
      `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_at, zeiger_id)
       VALUES (?, ?, ?, ?, ?)`,
    );
    insert.run(alice.id, cola.id, 120, '2026-05-10T12:00:00.000Z', null); // Person
    insert.run(alice.id, cola.id, 120, '2026-05-11T12:00:00.000Z', zeigerId); // Zeiger

    const report = reportService.calculateConsumption('2026-05-01', '2026-05-31');
    expect(report.total_count).toBe(2);
    expect(report.grand_total_cents).toBe(240);
  });

  it('grenzt den Zeitraum korrekt ab (inklusive Endtag)', async () => {
    const { db, reportService, alice, cola } = await setup();
    const insert = db.prepare(
      `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_at)
       VALUES (?, ?, ?, ?)`,
    );
    // 2026-05-31 lokal (Sommerzeit): innerhalb; 2026-06-01 lokal: außerhalb
    insert.run(alice.id, cola.id, 120, '2026-05-31T10:00:00.000Z');
    insert.run(alice.id, cola.id, 120, '2026-06-01T10:00:00.000Z');

    const report = reportService.calculateConsumption('2026-05-01', '2026-05-31');
    expect(report.total_count).toBe(1);
  });

  it('wirft AppError bei umgekehrtem Zeitraum', async () => {
    const { reportService } = await setup();
    expect(() => reportService.calculateConsumption('2026-05-31', '2026-05-01')).toThrow(AppError);
  });

  it('gibt leere Gruppen bei fehlenden Buchungen zurück', async () => {
    const { reportService } = await setup();
    const report = reportService.calculateConsumption('2026-05-01', '2026-05-31');
    expect(report.groups).toHaveLength(0);
    expect(report.total_count).toBe(0);
    expect(report.grand_total_cents).toBe(0);
  });
});
