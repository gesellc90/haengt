import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Db } from '../../../src/db/client.js';
import { MembersRepo } from '../../../src/db/repos/MembersRepo.js';
import { DrinksRepo } from '../../../src/db/repos/DrinksRepo.js';
import { BookingsRepo } from '../../../src/db/repos/BookingsRepo.js';
import { createTestDb } from './helpers.js';

describe('BookingsRepo', () => {
  let db: Db;
  let membersRepo: MembersRepo;
  let drinksRepo: DrinksRepo;
  let repo: BookingsRepo;

  // IDs von Fixtures
  let memberId: number;
  let drinkId: number;
  const PRICE = 150;

  beforeEach(() => {
    db = createTestDb();
    membersRepo = new MembersRepo(db);
    drinksRepo = new DrinksRepo(db);
    repo = new BookingsRepo(db);

    const member = membersRepo.create({ username: 'tester', display_name: 'Tester' });
    memberId = member.id;

    const drink = drinksRepo.create({ name: 'Bier', initialPriceCents: PRICE });
    drinkId = drink.id;
  });

  afterEach(() => {
    db.close();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create', () => {
    it('legt eine Buchung an', () => {
      const booking = repo.create({
        member_id: memberId,
        drink_id: drinkId,
        price_cents_snapshot: PRICE,
      });

      expect(booking.id).toBeGreaterThan(0);
      expect(booking.member_id).toBe(memberId);
      expect(booking.drink_id).toBe(drinkId);
      expect(booking.price_cents_snapshot).toBe(PRICE);
      expect(booking.voided_at).toBeNull();
      expect(booking.booked_by_id).toBeNull();
    });

    it('speichert booked_by_id bei Fremdbuchung', () => {
      const agent = membersRepo.create({
        username: 'allgemein',
        display_name: 'Allgemein',
        can_book_for_others: 1,
      });

      const booking = repo.create({
        member_id: memberId,
        drink_id: drinkId,
        price_cents_snapshot: PRICE,
        booked_by_id: agent.id,
      });

      expect(booking.member_id).toBe(memberId);
      expect(booking.booked_by_id).toBe(agent.id);
    });

    it('schlägt bei ungültigem member_id (FK) fehl', () => {
      expect(() =>
        repo.create({ member_id: 9999, drink_id: drinkId, price_cents_snapshot: 100 }),
      ).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------

  describe('findById', () => {
    it('gibt undefined zurück wenn nicht gefunden', () => {
      expect(repo.findById(999)).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // findByMember (Pagination)
  // ---------------------------------------------------------------------------

  describe('findByMember', () => {
    it('gibt aktive Buchungen des Mitglieds zurück', () => {
      repo.create({ member_id: memberId, drink_id: drinkId, price_cents_snapshot: PRICE });
      repo.create({ member_id: memberId, drink_id: drinkId, price_cents_snapshot: PRICE });

      const { items, hasMore } = repo.findByMember(memberId);
      expect(items).toHaveLength(2);
      expect(hasMore).toBe(false);
    });

    it('schließt stornierte Buchungen aus', () => {
      const b = repo.create({
        member_id: memberId,
        drink_id: drinkId,
        price_cents_snapshot: PRICE,
      });
      repo.void(b.id);

      const { items } = repo.findByMember(memberId);
      expect(items).toHaveLength(0);
    });

    it('paginiert korrekt via beforeId', () => {
      // 3 Buchungen anlegen
      const b1 = repo.create({
        member_id: memberId,
        drink_id: drinkId,
        price_cents_snapshot: PRICE,
      });
      const b2 = repo.create({
        member_id: memberId,
        drink_id: drinkId,
        price_cents_snapshot: PRICE,
      });
      repo.create({ member_id: memberId, drink_id: drinkId, price_cents_snapshot: PRICE });

      // Nur 2 holen, dann mit beforeId=b2.id weiter
      const page1 = repo.findByMember(memberId, 2);
      expect(page1.hasMore).toBe(true);
      expect(page1.items).toHaveLength(2);

      const page2 = repo.findByMember(memberId, 2, b2.id);
      expect(page2.items).toHaveLength(1);
      expect(page2.items[0]!.id).toBe(b1.id);
    });

    it('gibt nur Buchungen des angegebenen Mitglieds zurück', () => {
      const other = membersRepo.create({ username: 'other', display_name: 'Other' });
      repo.create({ member_id: other.id, drink_id: drinkId, price_cents_snapshot: PRICE });
      repo.create({ member_id: memberId, drink_id: drinkId, price_cents_snapshot: PRICE });

      const { items } = repo.findByMember(memberId);
      expect(items.every((b) => b.member_id === memberId)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // void
  // ---------------------------------------------------------------------------

  describe('void', () => {
    it('setzt voided_at', () => {
      const b = repo.create({
        member_id: memberId,
        drink_id: drinkId,
        price_cents_snapshot: PRICE,
      });
      expect(repo.void(b.id, 'Versehen')).toBe(true);

      const updated = repo.findById(b.id)!;
      expect(updated.voided_at).not.toBeNull();
      expect(updated.void_reason).toBe('Versehen');
    });

    it('gibt false zurück wenn bereits storniert', () => {
      const b = repo.create({
        member_id: memberId,
        drink_id: drinkId,
        price_cents_snapshot: PRICE,
      });
      repo.void(b.id);
      expect(repo.void(b.id)).toBe(false);
    });

    it('gibt false zurück wenn id nicht existiert', () => {
      expect(repo.void(9999)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // findMany (Admin-Filter)
  // ---------------------------------------------------------------------------

  describe('findMany', () => {
    it('gibt alle aktiven Buchungen zurück ohne Filter', () => {
      repo.create({ member_id: memberId, drink_id: drinkId, price_cents_snapshot: PRICE });
      expect(repo.findMany()).toHaveLength(1);
    });

    it('filtert nach memberId', () => {
      const other = membersRepo.create({ username: 'o2', display_name: 'O2' });
      repo.create({ member_id: memberId, drink_id: drinkId, price_cents_snapshot: PRICE });
      repo.create({ member_id: other.id, drink_id: drinkId, price_cents_snapshot: PRICE });

      const result = repo.findMany({ memberId });
      expect(result.every((b) => b.member_id === memberId)).toBe(true);
    });

    it('schließt stornierte aus (default)', () => {
      const b = repo.create({
        member_id: memberId,
        drink_id: drinkId,
        price_cents_snapshot: PRICE,
      });
      repo.void(b.id);
      expect(repo.findMany()).toHaveLength(0);
    });

    it('schließt stornierte ein wenn includeVoided=true', () => {
      const b = repo.create({
        member_id: memberId,
        drink_id: drinkId,
        price_cents_snapshot: PRICE,
      });
      repo.void(b.id);
      expect(repo.findMany({ includeVoided: true })).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // sumByDrink
  // ---------------------------------------------------------------------------

  describe('sumByDrink', () => {
    it('summiert korrekt', () => {
      const from = '2000-01-01T00:00:00.000Z';
      const to = '2099-12-31T23:59:59.999Z';

      repo.create({ member_id: memberId, drink_id: drinkId, price_cents_snapshot: PRICE });
      repo.create({ member_id: memberId, drink_id: drinkId, price_cents_snapshot: PRICE });

      const sums = repo.sumByDrink(memberId, from, to);
      expect(sums).toHaveLength(1);
      expect(sums[0]!.count).toBe(2);
      expect(sums[0]!.total_cents).toBe(PRICE * 2);
    });

    it('schließt stornierte Buchungen aus der Summe aus', () => {
      const from = '2000-01-01T00:00:00.000Z';
      const to = '2099-12-31T23:59:59.999Z';

      const b = repo.create({
        member_id: memberId,
        drink_id: drinkId,
        price_cents_snapshot: PRICE,
      });
      repo.void(b.id);

      const sums = repo.sumByDrink(memberId, from, to);
      expect(sums).toHaveLength(0);
    });
  });
});
