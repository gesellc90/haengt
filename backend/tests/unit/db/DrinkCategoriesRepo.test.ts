import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Db } from '../../../src/db/client.js';
import { DrinkCategoriesRepo } from '../../../src/db/repos/DrinkCategoriesRepo.js';
import { DrinksRepo } from '../../../src/db/repos/DrinksRepo.js';
import { createTestDb } from './helpers.js';

describe('DrinkCategoriesRepo', () => {
  let db: Db;
  let repo: DrinkCategoriesRepo;

  beforeEach(() => {
    db = createTestDb();
    repo = new DrinkCategoriesRepo(db);
  });

  afterEach(() => {
    db.close();
  });

  it('legt Migration die Standardkategorie „Sonstige" an', () => {
    const sonstige = repo.findByName('Sonstige');
    expect(sonstige).toBeDefined();
    expect(sonstige?.sort_order).toBe(0);
  });

  describe('create', () => {
    it('sortiert neue Kategorien ans Ende', () => {
      const bier = repo.create({ name: 'Bier' });
      // „Sonstige" hat sort_order 0 → nächste bekommt 1
      expect(bier.sort_order).toBe(1);
      const wein = repo.create({ name: 'Wein' });
      expect(wein.sort_order).toBe(2);
    });

    it('respektiert eine explizite sort_order', () => {
      const c = repo.create({ name: 'Spezial', sort_order: 5 });
      expect(c.sort_order).toBe(5);
    });
  });

  describe('findAll', () => {
    it('sortiert nach sort_order, dann Name', () => {
      repo.create({ name: 'Bier', sort_order: 2 });
      repo.create({ name: 'Alkoholfrei', sort_order: 1 });
      const all = repo.findAll();
      expect(all.map((c) => c.name)).toEqual(['Sonstige', 'Alkoholfrei', 'Bier']);
    });
  });

  describe('update', () => {
    it('benennt eine Kategorie um', () => {
      const c = repo.create({ name: 'Alt' });
      const updated = repo.update(c.id, { name: 'Neu' });
      expect(updated?.name).toBe('Neu');
    });

    it('gibt undefined zurück wenn nicht gefunden', () => {
      expect(repo.update(9999, { name: 'X' })).toBeUndefined();
    });
  });

  describe('countDrinks / delete', () => {
    it('zählt zugeordnete Getränke', () => {
      const drinks = new DrinksRepo(db);
      const bier = repo.create({ name: 'Bier' });
      drinks.create({ name: 'Pils', categoryId: bier.id, initialPriceCents: 150 });
      expect(repo.countDrinks(bier.id)).toBe(1);
    });

    it('löscht eine leere Kategorie', () => {
      const c = repo.create({ name: 'Leer' });
      expect(repo.delete(c.id)).toBe(true);
      expect(repo.findById(c.id)).toBeUndefined();
    });

    it('verhindert das Löschen einer belegten Kategorie (FK RESTRICT)', () => {
      const drinks = new DrinksRepo(db);
      const bier = repo.create({ name: 'Bier' });
      drinks.create({ name: 'Pils', categoryId: bier.id, initialPriceCents: 150 });
      expect(() => repo.delete(bier.id)).toThrow();
    });
  });

  describe('reorder', () => {
    it('setzt sort_order gemäß Reihenfolge', () => {
      const a = repo.create({ name: 'A' });
      const b = repo.create({ name: 'B' });
      const sonstige = repo.findByName('Sonstige')!;

      repo.reorder([b.id, a.id, sonstige.id]);

      const all = repo.findAll();
      expect(all.map((c) => c.name)).toEqual(['B', 'A', 'Sonstige']);
    });
  });
});
