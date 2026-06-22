import type { BookingsRepo, PaginatedBookings, BookingFilter } from '../db/repos/BookingsRepo.js';
import type { DrinksRepo } from '../db/repos/DrinksRepo.js';
import type { MembersRepo } from '../db/repos/MembersRepo.js';
import type { AuditLogRepo } from '../db/repos/AuditLogRepo.js';
import type { BookingRow } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';

/** 5 Minuten in Millisekunden – maximales Storno-Fenster */
const VOID_WINDOW_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// BookingService — Business-Logik für Buchungen
// ---------------------------------------------------------------------------

export class BookingService {
  constructor(
    private readonly bookings: BookingsRepo,
    private readonly drinks: DrinksRepo,
    private readonly auditLog: AuditLogRepo,
    private readonly members: MembersRepo,
  ) {}

  // ---------------------------------------------------------------------------
  // Buchung anlegen (mit Preis-Snapshot)
  //
  // actorId  = wer bucht (eingeloggtes Konto)
  // targetId = optionales Ziel-Mitglied; nur erlaubt, wenn der Actor
  //            can_book_for_others = 1 hat (Theken-/Allgemein-Konto).
  // ---------------------------------------------------------------------------

  create(actorId: number, drinkId: number, targetId?: number): BookingRow {
    const memberId = this.resolveBookingTarget(actorId, targetId);

    // Getränk muss existieren und verfügbar sein
    const drink = this.drinks.findById(drinkId);
    if (!drink) throw new AppError('Getränk nicht gefunden', 404, 'NOT_FOUND');
    if (drink.is_available === 0) {
      throw new AppError('Getränk ist nicht verfügbar', 409, 'DRINK_UNAVAILABLE');
    }

    // Aktuellen Preis ermitteln (Snapshot zum Buchungszeitpunkt)
    const currentPrice = this.drinks.getCurrentPrice(drinkId);
    if (!currentPrice) {
      throw new AppError('Kein gültiger Preis für dieses Getränk hinterlegt', 409, 'NO_PRICE');
    }

    const isForOther = memberId !== actorId;
    const booking = this.bookings.create({
      member_id: memberId,
      drink_id: drinkId,
      price_cents_snapshot: currentPrice.price_cents,
      booked_by_id: isForOther ? actorId : null,
    });

    this.auditLog.create({
      event_type: 'booking_created',
      actor_id: actorId,
      target_type: 'booking',
      target_id: booking.id,
      meta: {
        member_id: memberId,
        drink_id: drinkId,
        drink_name: drink.name,
        price_cents_snapshot: currentPrice.price_cents,
      },
    });

    return booking;
  }

  /**
   * Prüft, ob der Actor für das angegebene Ziel buchen darf, und liefert das
   * effektive Ziel-Mitglied zurück. Ohne `targetId` bucht der Actor für sich
   * selbst. Mit `targetId` ist die Buchung nur erlaubt, wenn der Actor
   * `can_book_for_others = 1` hat und das Ziel existiert.
   */
  private resolveBookingTarget(actorId: number, targetId?: number): number {
    if (targetId === undefined || targetId === actorId) return actorId;

    const actor = this.members.findById(actorId);
    if (!actor || actor.can_book_for_others !== 1) {
      throw new AppError('Keine Berechtigung für andere Mitglieder zu buchen', 403, 'FORBIDDEN');
    }

    const target = this.members.findById(targetId);
    if (!target) throw new AppError('Ziel-Mitglied nicht gefunden', 404, 'NOT_FOUND');

    return targetId;
  }

  // ---------------------------------------------------------------------------
  // Eigene Buchungen (paginiert)
  // ---------------------------------------------------------------------------

  findByMember(memberId: number, limit: number, beforeId?: number): PaginatedBookings {
    return this.bookings.findByMember(memberId, limit, beforeId);
  }

  // ---------------------------------------------------------------------------
  // Fremde Buchungen für den Theken-Screen lesen.
  // Nur Konten mit can_book_for_others dürfen die Buchungen anderer Mitglieder
  // einsehen (beschränkt auf den member_id-Filter).
  // ---------------------------------------------------------------------------

  findForMemberAs(
    actorId: number,
    targetMemberId: number,
    limit: number,
    beforeId?: number,
  ): PaginatedBookings {
    if (targetMemberId !== actorId) {
      const actor = this.members.findById(actorId);
      if (!actor || actor.can_book_for_others !== 1) {
        throw new AppError('Keine Berechtigung fremde Buchungen zu lesen', 403, 'FORBIDDEN');
      }
    }
    return this.bookings.findByMember(targetMemberId, limit, beforeId);
  }

  // ---------------------------------------------------------------------------
  // Admin: alle Buchungen mit Filter
  // ---------------------------------------------------------------------------

  findMany(filter: BookingFilter, limit: number): BookingRow[] {
    return this.bookings.findMany(filter, limit);
  }

  // ---------------------------------------------------------------------------
  // Buchung stornieren (5-Minuten-Fenster, nur eigene oder Admin)
  // ---------------------------------------------------------------------------

  void(
    bookingId: number,
    requesterId: number,
    requesterRole: 'admin' | 'member',
    reason?: string,
  ): BookingRow {
    const booking = this.bookings.findById(bookingId);
    if (!booking) throw new AppError('Buchung nicht gefunden', 404, 'NOT_FOUND');

    if (booking.voided_at !== null) {
      throw new AppError('Buchung ist bereits storniert', 409, 'ALREADY_VOIDED');
    }

    // Members dürfen nur eigene Buchungen stornieren – Konten mit
    // can_book_for_others zusätzlich die Buchungen, die sie selbst für andere
    // angelegt haben (booked_by_id == requesterId).
    if (
      requesterRole !== 'admin' &&
      booking.member_id !== requesterId &&
      booking.booked_by_id !== requesterId
    ) {
      throw new AppError('Keine Berechtigung diese Buchung zu stornieren', 403, 'FORBIDDEN');
    }

    // 5-Minuten-Fenster nur für Members (Admins dürfen immer stornieren)
    if (requesterRole !== 'admin') {
      const bookedAt = new Date(booking.booked_at).getTime();
      const now = Date.now();
      if (now - bookedAt > VOID_WINDOW_MS) {
        throw new AppError(
          'Buchung kann nicht mehr storniert werden (5-Minuten-Fenster abgelaufen)',
          409,
          'VOID_WINDOW_EXPIRED',
        );
      }
    }

    const ok = this.bookings.void(bookingId, reason);
    if (!ok) throw new AppError('Stornierung fehlgeschlagen', 500);

    this.auditLog.create({
      event_type: 'booking_voided',
      actor_id: requesterId,
      target_type: 'booking',
      target_id: bookingId,
      meta: { reason: reason ?? null, member_id: booking.member_id },
    });

    return this.bookings.findById(bookingId)!;
  }
}
