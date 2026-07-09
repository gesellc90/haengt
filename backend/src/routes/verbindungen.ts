import { Router } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  createVerbindungSchema,
  updateVerbindungSchema,
  listVerbindungenSchema,
} from '../schemas/verbindungen.js';
import type { AuthService } from '../services/AuthService.js';
import type { VerbindungenService } from '../services/VerbindungenService.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

export function createVerbindungenRouter(
  authService: AuthService,
  verbindungenService: VerbindungenService,
): Router {
  const router = Router();
  const auth = authenticate(authService);
  const admin = requireRole('admin');

  // -------------------------------------------------------------------------
  // GET /verbindungen  (alle eingeloggten User — für Dropdown bei Zeiger)
  // ?includeInactive=true — nur Admin sinnvoll
  // -------------------------------------------------------------------------
  router.get('/', auth, (req, res, next) => {
    const parsed = listVerbindungenSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Parameter', details: parsed.error.flatten() });
      return;
    }

    try {
      const rows = verbindungenService.findAll(parsed.data.includeInactive ?? false);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // POST /verbindungen  (Admin)
  // -------------------------------------------------------------------------
  router.post('/', auth, admin, (req, res, next) => {
    const parsed = createVerbindungSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const row = verbindungenService.create(
        {
          name: parsed.data.name,
          zirkel: parsed.data.zirkel ?? null,
          ort: parsed.data.ort ?? null,
        },
        actorId,
      );
      res.status(201).json(row);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // PATCH /verbindungen/:id  (Admin) — Teilaktualisierung
  // -------------------------------------------------------------------------
  router.patch('/:id', auth, admin, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    const parsed = updateVerbindungSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const updated = verbindungenService.update(id, parsed.data, actorId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // DELETE /verbindungen/:id  (Admin) — Soft-Deactivate
  // -------------------------------------------------------------------------
  router.delete('/:id', auth, admin, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      verbindungenService.deactivate(id, actorId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
