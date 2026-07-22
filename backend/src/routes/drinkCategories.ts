import { Router } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  createDrinkCategorySchema,
  updateDrinkCategorySchema,
  reorderDrinkCategoriesSchema,
} from '../schemas/drinkCategories.js';
import type { AuthService } from '../services/AuthService.js';
import type { DrinkCategoriesService } from '../services/DrinkCategoriesService.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

// ---------------------------------------------------------------------------
// Drink-Categories-Router
//
// GET ist für alle eingeloggten Nutzer (die Buchungsansicht clustert danach),
// alle schreibenden Operationen sind Admin-only.
// ---------------------------------------------------------------------------

export function createDrinkCategoriesRouter(
  authService: AuthService,
  categoriesService: DrinkCategoriesService,
): Router {
  const router = Router();
  const auth = authenticate(authService);
  const admin = requireRole('admin');

  // -------------------------------------------------------------------------
  // GET /drink-categories  (alle eingeloggten Nutzer)
  // -------------------------------------------------------------------------
  router.get('/', auth, (_req, res, next) => {
    try {
      res.json(categoriesService.findAll());
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // POST /drink-categories  (Admin)
  // -------------------------------------------------------------------------
  router.post('/', auth, admin, (req, res, next) => {
    const parsed = createDrinkCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const category = categoriesService.create(parsed.data, actorId);
      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // PUT /drink-categories/order  (Admin) — Reihenfolge neu setzen
  // Vor /:id definiert, damit "order" nicht als ID interpretiert wird.
  // -------------------------------------------------------------------------
  router.put('/order', auth, admin, (req, res, next) => {
    const parsed = reorderDrinkCategoriesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const categories = categoriesService.reorder(parsed.data.ordered_ids, actorId);
      res.json(categories);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // PATCH /drink-categories/:id  (Admin)
  // -------------------------------------------------------------------------
  router.patch('/:id', auth, admin, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    const parsed = updateDrinkCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const category = categoriesService.update(id, parsed.data, actorId);
      res.json(category);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // DELETE /drink-categories/:id  (Admin) — nur wenn keine Getränke zugeordnet
  // -------------------------------------------------------------------------
  router.delete('/:id', auth, admin, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      categoriesService.remove(id, actorId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
