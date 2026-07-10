import { Router } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { createMemberSchema, updateMemberSchema } from '../schemas/members.js';
import { toPublicMember } from '../services/MembersService.js';
import { avatarUpload, saveAvatar, removeAvatarFile } from '../utils/avatar.js';
import type { AuthService } from '../services/AuthService.js';
import type { MembersService } from '../services/MembersService.js';

// ---------------------------------------------------------------------------
// Hilfsfunktion: :id aus den Params parsen und validieren
// ---------------------------------------------------------------------------

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

// ---------------------------------------------------------------------------
// Members-Router (alle Endpunkte sind Admin-only)
// ---------------------------------------------------------------------------

export function createMembersRouter(
  authService: AuthService,
  membersService: MembersService,
  avatarDir: string,
): Router {
  const router = Router();
  const auth = authenticate(authService);
  const admin = requireRole('admin');

  // -------------------------------------------------------------------------
  // GET /members?includeInactive=true
  // -------------------------------------------------------------------------
  router.get('/', auth, admin, (req, res, next) => {
    try {
      const includeInactive = req.query['includeInactive'] === 'true';
      const members = membersService.findAll(includeInactive);
      res.json(members.map(toPublicMember));
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // POST /members
  // -------------------------------------------------------------------------
  router.post('/', auth, admin, async (req, res, next) => {
    const parsed = createMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const member = await membersService.create(parsed.data, actorId);
      res.status(201).json(toPublicMember(member));
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // GET /members/bookable  (Theken-/Allgemein-Konto)
  // Bebuchbare Mitglieder, nach Kategorie sortiert. Nur Konten mit
  // can_book_for_others (sonst 403). MUSS vor /:id stehen.
  // -------------------------------------------------------------------------
  router.get('/bookable', auth, (req, res, next) => {
    try {
      const requesterId = Number((req as AuthenticatedRequest).auth.sub);
      const requester = membersService.findById(requesterId);
      if (requester.can_book_for_others !== 1) {
        res.status(403).json({ error: 'Keine Berechtigung', code: 'FORBIDDEN' });
        return;
      }
      res.json(membersService.findBookable().map(toPublicMember));
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // GET /members/:id
  // -------------------------------------------------------------------------
  router.get('/:id', auth, admin, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    try {
      const member = membersService.findById(id);
      res.json(toPublicMember(member));
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // PATCH /members/:id
  // -------------------------------------------------------------------------
  router.patch('/:id', auth, admin, async (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    const parsed = updateMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const member = await membersService.update(id, parsed.data, actorId);
      res.json(toPublicMember(member));
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // POST /members/:id/avatar — Profilbild eines Mitglieds setzen (Admin)
  // (max 5 MB → 256×256 WebP; Admin-Pendant zu POST /auth/me/avatar)
  // -------------------------------------------------------------------------
  router.post('/:id/avatar', auth, admin, avatarUpload.single('avatar'), async (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Keine Datei übermittelt' });
      return;
    }

    try {
      // Existenz sicherstellen, bevor eine Datei geschrieben wird (404 statt Leiche).
      membersService.findById(id);
      const actorId = Number((req as AuthenticatedRequest).auth.sub);

      const filename = await saveAvatar(avatarDir, id, req.file.buffer);
      const member = await membersService.update(id, { avatar_path: filename }, actorId);
      res.json(toPublicMember(member));
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // DELETE /members/:id/avatar — Profilbild eines Mitglieds entfernen (Admin)
  // -------------------------------------------------------------------------
  router.delete('/:id/avatar', auth, admin, async (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    try {
      const existing = membersService.findById(id);
      const actorId = Number((req as AuthenticatedRequest).auth.sub);

      removeAvatarFile(avatarDir, existing.avatar_path);
      const member = await membersService.update(id, { avatar_path: null }, actorId);
      res.json(toPublicMember(member));
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // DELETE /members/:id  (Soft-Delete)
  // -------------------------------------------------------------------------
  router.delete('/:id', auth, admin, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      membersService.deactivate(id, actorId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
