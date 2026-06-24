import { Router } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import {
  createZeigerSchema,
  updateZeigerSchema,
  closeZeigerSchema,
  listZeigerSchema,
} from '../schemas/zeiger.js';
import type { AuthService } from '../services/AuthService.js';
import type { ZeigerService } from '../services/ZeigerService.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

export function createZeigerRouter(authService: AuthService, zeigerService: ZeigerService): Router {
  const router = Router();
  const auth = authenticate(authService);

  // -------------------------------------------------------------------------
  // POST /zeiger  (Member + Admin)
  // Neuen Zeiger anlegen. Jedes eingeloggte Mitglied darf das.
  // -------------------------------------------------------------------------
  router.post('/', auth, (req, res, next) => {
    const parsed = createZeigerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const row = zeigerService.create(actorId, parsed.data);
      res.status(201).json(row);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // GET /zeiger  (Member + Admin)
  // ?status=offen|geschlossen — ohne Parameter: alle Zeiger
  // -------------------------------------------------------------------------
  router.get('/', auth, (req, res, next) => {
    const parsed = listZeigerSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Parameter', details: parsed.error.flatten() });
      return;
    }

    try {
      const rows = zeigerService.findAll(parsed.data.status);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // GET /zeiger/:id  (Member + Admin)
  // -------------------------------------------------------------------------
  router.get('/:id', auth, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    try {
      res.json(zeigerService.findById(id));
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // PATCH /zeiger/:id  (Member + Admin)
  // BBr/Gäste-Zahlen aktualisieren — nur solange offen.
  // -------------------------------------------------------------------------
  router.patch('/:id', auth, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    const parsed = updateZeigerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const updated = zeigerService.update(id, actorId, parsed.data);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // POST /zeiger/:id/close  (Member + Admin)
  // Zeiger schließen. Optional: letzte BBr/Gäste-Zahlen übergeben.
  // -------------------------------------------------------------------------
  router.post('/:id/close', auth, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    const parsed = closeZeigerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const closed = zeigerService.close(id, actorId, parsed.data);
      res.json(closed);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
