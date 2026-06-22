import { Router } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  createBookingSchema,
  voidBookingSchema,
  bookingsFilterSchema,
  myBookingsSchema,
} from '../schemas/bookings.js';
import type { AuthService } from '../services/AuthService.js';
import type { BookingService } from '../services/BookingService.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

// ---------------------------------------------------------------------------
// Bookings-Router
// WICHTIG: /bookings/me muss VOR /bookings/:id registriert sein, sonst
// matcht Express "me" als numerische ID und gibt 400 zurück.
// ---------------------------------------------------------------------------

export function createBookingsRouter(
  authService: AuthService,
  bookingService: BookingService,
): Router {
  const router = Router();
  const auth = authenticate(authService);
  const admin = requireRole('admin');

  // -------------------------------------------------------------------------
  // POST /bookings  (User)
  // Buchung anlegen – Preis wird zum Buchungszeitpunkt als Snapshot gespeichert.
  // -------------------------------------------------------------------------
  router.post('/', auth, (req, res, next) => {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const booking = bookingService.create(actorId, parsed.data.drink_id, parsed.data.member_id);
      res.status(201).json(booking);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // GET /bookings/me  (User) — eigene Buchungen, paginiert
  // ?limit=50&before=<id>
  // -------------------------------------------------------------------------
  router.get('/me', auth, (req, res, next) => {
    const parsed = myBookingsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Parameter', details: parsed.error.flatten() });
      return;
    }

    try {
      const memberId = Number((req as AuthenticatedRequest).auth.sub);
      const result = bookingService.findByMember(memberId, parsed.data.limit, parsed.data.before);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // GET /bookings/member/:id  (Theken-/Allgemein-Konto)
  // Buchungen eines bestimmten Mitglieds, paginiert. Nur Konten mit
  // can_book_for_others dürfen fremde Buchungen lesen (sonst 403).
  // -------------------------------------------------------------------------
  router.get('/member/:id', auth, (req, res, next) => {
    const memberId = parseId(req.params['id'] ?? '');
    if (memberId === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    const parsed = myBookingsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Parameter', details: parsed.error.flatten() });
      return;
    }

    try {
      const actorId = Number((req as AuthenticatedRequest).auth.sub);
      const result = bookingService.findForMemberAs(
        actorId,
        memberId,
        parsed.data.limit,
        parsed.data.before,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // GET /bookings  (Admin) — alle Buchungen mit Filtern
  // ?member_id=&from=&to=&include_voided=true&limit=100
  // -------------------------------------------------------------------------
  router.get('/', auth, admin, (req, res, next) => {
    const parsed = bookingsFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Parameter', details: parsed.error.flatten() });
      return;
    }

    try {
      const { member_id, from, to, include_voided, limit } = parsed.data;
      const bookings = bookingService.findMany(
        {
          memberId: member_id,
          fromDate: from,
          toDate: to,
          includeVoided: include_voided,
        },
        limit,
      );
      res.json(bookings);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // POST /bookings/:id/void  (User oder Admin)
  // User: nur eigene Buchungen, max. 5 Minuten nach Buchung
  // Admin: beliebige Buchungen, kein Zeitlimit
  // -------------------------------------------------------------------------
  router.post('/:id/void', auth, (req, res, next) => {
    const id = parseId(req.params['id'] ?? '');
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID' });
      return;
    }

    const parsed = voidBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    try {
      const { sub, role } = (req as AuthenticatedRequest).auth;
      const requesterId = Number(sub);
      const booking = bookingService.void(id, requesterId, role, parsed.data.reason);
      res.json(booking);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
