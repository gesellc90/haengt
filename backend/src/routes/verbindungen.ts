import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  createVerbindungSchema,
  updateVerbindungSchema,
  listVerbindungenSchema,
} from '../schemas/verbindungen.js';
import type { AuthService } from '../services/AuthService.js';
import type { VerbindungenRepo } from '../db/repos/VerbindungenRepo.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

export function createVerbindungenRouter(
  authService: AuthService,
  verbindungenRepo: VerbindungenRepo,
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
      const rows = verbindungenRepo.findAll(parsed.data.includeInactive ?? false);
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
      const row = verbindungenRepo.create({
        name: parsed.data.name,
        zirkel: parsed.data.zirkel ?? null,
        ort: parsed.data.ort ?? null,
      });
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
      const updated = verbindungenRepo.update(id, parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Verbindung nicht gefunden', code: 'NOT_FOUND' });
        return;
      }
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
      const ok = verbindungenRepo.deactivate(id);
      if (!ok) {
        res.status(404).json({ error: 'Verbindung nicht gefunden', code: 'NOT_FOUND' });
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
