/**
 * Unit-Tests für ReportService.
 *
 * Getestete Szenarien:
 *  - calculateMonthly: Aggregation, Monatsgrenze, stornierte Buchungen ignoriert
 *  - calculateMonthly: AppError(404) bei unbekanntem Mitglied
 *  - calculateAllMembers: Alle aktiven Mitglieder werden einbezogen
 *  - monthBounds: Korrekte UTC-Grenzen inkl. Jahreswechsel
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

  const cola = drinksRepo.create({ name: 'Cola', initialPriceCents: 120 });
  const bier = drinksRepo.create({ name: 'Bier', initialPriceCents: 250 });

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
  it('gibt korrekten UTC-Bereich für Mai 2026 zurück', () => {
    const { from, to } = monthBounds(2026, 5);
    expect(from).toBe('2026-05-01T00:00:00.000Z');
    expect(to).toBe('2026-06-01T00:00:00.000Z');
  });

  it('behandelt Jahreswechsel korrekt (Dezember)', () => {
    const { from, to } = monthBounds(2026, 12);
    expect(from).toBe('2026-12-01T00:00:00.000Z');
    expect(to).toBe('2027-01-01T00:00:00.000Z');
  });

  it('behandelt Januar korrekt', () => {
    const { from, to } = monthBounds(2026, 1);
    expect(from).toBe('2026-01-01T00:00:00.000Z');
    expect(to).toBe('2026-02-01T00:00:00.000Z');
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

  it('berücksichtigt nur Buchungen des angegebenen Monats', async () => {
    const { db, reportService, alice, cola } = await setup();

    // Buchung direkt in DB einfügen mit expliziten Zeitstempeln (bessere Kontrolle)
    db.prepare(
      `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_at)
       VALUES (?, ?, ?, ?)`,
    ).run(alice.id, cola.id, 120, '2026-04-30T23:59:59.999Z'); // April → soll nicht auftauchen

    db.prepare(
      `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_at)
       VALUES (?, ?, ?, ?)`,
    ).run(alice.id, cola.id, 120, '2026-05-01T00:00:00.000Z'); // Mai → soll auftauchen

    db.prepare(
      `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_at)
       VALUES (?, ?, ?, ?)`,
    ).run(alice.id, cola.id, 120, '2026-06-01T00:00:00.000Z'); // Juni → soll nicht auftauchen

    const report = reportService.calculateMonthly(alice.id, 2026, 5);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0]?.booked_at).toBe('2026-05-01T00:00:00.000Z');
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
