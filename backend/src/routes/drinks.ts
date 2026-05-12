import { Router } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { createDrinkSchema, updateDrinkSchema, addPriceSchema } from '../schemas/drinks.js';
import type { AuthService } from '../services/AuthService.js';
import type { DrinksService } from '../services/DrinksService.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

// ---------------------------------------------------------------------------
// Drinks-Router
// ---------------------------------------------------------------------------

export function createDrinksRouter(authService: AuthService, drinksService: DrinksService): Router {
  const router = Router();
  const auth = authenticate(authService);
  const admin = requireRole('admin');

  // -------------------------------------------------------------------------
  // GET /drinks
  // User: nur verfügbare Getränke + aktueller Preis
  // Admin: alle Getränke (inkl. deaktivierter, ohne Preise)
  // -------------------------------------------------------------------------
  router.get('/', auth, (req, res, next) => {
    try {
      const { auth: jwtPayload } = req as AuthenticatedRequest;
      if (jwtPayload.role === 'admin') {
        res.json(drinksService.findAll());
      } else {
        res.json(drinksService.findAvailable());
      }
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // POST /drinks  (Admin)
  // -------------------------------------------------------------------------
  router.post('/', auth, admin, (req, res, next) => {
    const parsed = createDrinkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const drink = drinksService.create(parsed.data, actorId);
      res.status(201).json(drink);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // PATCH /drinks/:id  (Admin)
  // -------------------------------------------------------------------------
  router.patch('/:id', auth, admin, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    const parsed = updateDrinkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const drink = drinksService.update(id, parsed.data, actorId);
      res.json(drink);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // POST /drinks/:id/prices  (Admin)
  // -------------------------------------------------------------------------
  router.post('/:id/prices', auth, admin, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    const parsed = addPriceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const priceRow = drinksService.addPrice(id, parsed.data, actorId);
      res.status(201).json(priceRow);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // GET /drinks/:id/prices  (Admin — Preishistorie)
  // -------------------------------------------------------------------------
  router.get('/:id/prices', auth, admin, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    try {
      const history = drinksService.getPriceHistory(id);
      res.json(history);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
