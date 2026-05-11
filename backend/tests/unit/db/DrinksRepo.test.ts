import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Db } from '../../../src/db/client.js';
import { DrinksRepo } from '../../../src/db/repos/DrinksRepo.js';
import { createTestDb } from './helpers.js';

describe('DrinksRepo', () => {
  let db: Db;
  let repo: DrinksRepo;

  beforeEach(() => {
    db = createTestDb();
    repo = new DrinksRepo(db);
  });

  afterEach(() => {
    db.close();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create', () => {
    it('legt ein Getränk mit initialem Preis an', () => {
      const drink = repo.create({ name: 'Cola', initialPriceCents: 100 });

      expect(drink.id).toBeGreaterThan(0);
      expect(drink.name).toBe('Cola');
      expect(drink.is_available).toBe(1);

      const price = repo.getCurrentPrice(drink.id);
      expect(price?.price_cents).toBe(100);
    });

    it('schlägt bei doppeltem Namen fehl', () => {
      repo.create({ name: 'Wasser', initialPriceCents: 50 });
      expect(() => repo.create({ name: 'Wasser', initialPriceCents: 60 })).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // findById / findAll
  // ---------------------------------------------------------------------------

  describe('findById', () => {
    it('gibt undefined zurück wenn nicht gefunden', () => {
      expect(repo.findById(999)).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('gibt alle Getränke zurück (inkl. deaktivierte)', () => {
      const _d1 = repo.create({ name: 'A', initialPriceCents: 10 });
      const d2 = repo.create({ name: 'B', initialPriceCents: 20 });
      repo.deactivate(d2.id);

      expect(repo.findAll(false)).toHaveLength(2);
    });

    it('filtert deaktivierte Getränke wenn onlyAvailable=true', () => {
      const d = repo.create({ name: 'Weg', initialPriceCents: 0 });
      repo.deactivate(d.id);
      repo.create({ name: 'Da', initialPriceCents: 100 });

      const available = repo.findAll(true);
      expect(available.every((x) => x.is_available === 1)).toBe(true);
      expect(available.some((x) => x.id === d.id)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // findAvailableWithCurrentPrice
  // ---------------------------------------------------------------------------

  describe('findAvailableWithCurrentPrice', () => {
    it('gibt current_price_cents zurück', () => {
      repo.create({ name: 'Bier', initialPriceCents: 150 });
      const result = repo.findAvailableWithCurrentPrice();

      expect(result).toHaveLength(1);
      expect(result[0]!.current_price_cents).toBe(150);
    });

    it('zeigt deaktivierte Getränke nicht', () => {
      const d = repo.create({ name: 'Alt', initialPriceCents: 80 });
      repo.deactivate(d.id);

      expect(repo.findAvailableWithCurrentPrice()).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // deactivate
  // ---------------------------------------------------------------------------

  describe('deactivate', () => {
    it('setzt is_available = 0', () => {
      const d = repo.create({ name: 'X', initialPriceCents: 10 });
      expect(repo.deactivate(d.id)).toBe(true);
      expect(repo.findById(d.id)?.is_available).toBe(0);
    });

    it('gibt false zurück wenn nicht gefunden', () => {
      expect(repo.deactivate(9999)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Preisverwaltung
  // ---------------------------------------------------------------------------

  describe('addPrice / getCurrentPrice / getPriceHistory', () => {
    it('getCurrentPrice gibt undefined zurück wenn kein Preis', () => {
      // Direkt per SQL einfügen, ohne Preis
      const id = db.prepare('INSERT INTO drinks (name) VALUES (?)').run('Leer')
        .lastInsertRowid as number;
      expect(repo.getCurrentPrice(id)).toBeUndefined();
    });

    it('addPrice überschreibt den aktuellen Preis nicht, sondern ergänzt die Historie', () => {
      const d = repo.create({ name: 'Spezi', initialPriceCents: 120 });
      repo.addPrice(d.id, 130);

      const history = repo.getPriceHistory(d.id);
      expect(history).toHaveLength(2);

      const current = repo.getCurrentPrice(d.id);
      expect(current?.price_cents).toBe(130);
    });

    it('getPriceHistory ist neueste-zuerst sortiert', () => {
      const d = repo.create({ name: 'Sort', initialPriceCents: 100 });
      // Explizit älteres valid_from setzen
      repo.addPrice(d.id, 200, '2099-01-01T00:00:00.000Z');

      const history = repo.getPriceHistory(d.id);
      expect(history[0]!.price_cents).toBe(200);
    });
  });
});
