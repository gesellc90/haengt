import { useCallback, useEffect, useState } from 'react';
import { bookingsApi } from '../api/bookings.js';
import { drinksApi } from '../api/drinks.js';
import { ApiError } from '../api/client.js';
import { useToast } from '../contexts/ToastContext.js';
import Spinner from '../components/Spinner.js';
import type { BookingRow, DrinkWithCurrentPrice } from '../types/api.js';

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/** Prüft ob eine Buchung noch innerhalb des 5-Minuten-Storno-Fensters liegt */
function isVoidable(booking: BookingRow): boolean {
  if (booking.voided_at !== null) return false;
  const bookedAt = new Date(booking.booked_at).getTime();
  return Date.now() - bookedAt < 5 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Buchungshistorie der letzten 24h
// ---------------------------------------------------------------------------

interface BookingHistoryProps {
  bookings: BookingRow[];
  drinks: DrinkWithCurrentPrice[];
  onVoid(bookingId: number): void;
  voidingId: number | null;
}

function BookingHistory({ bookings, drinks, onVoid, voidingId }: BookingHistoryProps) {
  const drinkMap = new Map(drinks.map((d) => [d.id, d]));
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recent = bookings.filter((b) => new Date(b.booked_at).getTime() > cutoff);

  if (recent.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Noch keine Buchungen heute.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
      {recent.map((b) => {
        const drink = drinkMap.get(b.drink_id);
        const voided = b.voided_at !== null;
        return (
          <li
            key={b.id}
            className={`flex items-center justify-between gap-3 py-3 ${voided ? 'opacity-40' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${voided ? 'line-through' : ''} text-slate-800 dark:text-slate-200`}
              >
                {drink?.name ?? `Getränk #${b.drink_id}`}
              </p>
              <p className="text-xs text-slate-400">
                {formatTime(b.booked_at)}
                {voided && ' · storniert'}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {formatCents(b.price_cents_snapshot)}
            </span>
            {!voided && isVoidable(b) && (
              <button
                onClick={() => onVoid(b.id)}
                disabled={voidingId === b.id}
                aria-label="Buchung stornieren"
                className="min-h-touch shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                {voidingId === b.id ? <Spinner size="h-3 w-3" /> : 'Storno'}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export default function BookingPage() {
  const { showToast } = useToast();

  const [drinks, setDrinks] = useState<DrinkWithCurrentPrice[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [isLoadingDrinks, setIsLoadingDrinks] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  /** ID des Getränks, das gerade gebucht wird (für Loading-State am Button) */
  const [bookingDrinkId, setBookingDrinkId] = useState<number | null>(null);
  /** ID der Buchung, die gerade storniert wird */
  const [voidingId, setVoidingId] = useState<number | null>(null);

  // -- Daten laden ----------------------------------------------------------

  useEffect(() => {
    drinksApi
      .getAvailable()
      .then(setDrinks)
      .catch(() => showToast('Getränke konnten nicht geladen werden.', 'error'))
      .finally(() => setIsLoadingDrinks(false));
  }, [showToast]);

  const loadBookings = useCallback(() => {
    bookingsApi
      .getMine(50)
      .then((res) => setBookings(res.items))
      .catch(() => showToast('Buchungshistorie konnte nicht geladen werden.', 'error'))
      .finally(() => setIsLoadingBookings(false));
  }, [showToast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // -- Buchung anlegen ------------------------------------------------------

  async function handleBook(drink: DrinkWithCurrentPrice) {
    if (bookingDrinkId !== null) return; // Debounce: nur eine Buchung gleichzeitig

    // Optimistic Update: Platzhalter-Buchung sofort anzeigen
    const optimisticId = -Date.now(); // negative ID als Platzhalter
    const optimistic: BookingRow = {
      id: optimisticId,
      member_id: 0,
      drink_id: drink.id,
      price_cents_snapshot: drink.current_price_cents ?? 0,
      booked_at: new Date().toISOString(),
      voided_at: null,
      void_reason: null,
    };
    setBookings((prev) => [optimistic, ...prev]);
    setBookingDrinkId(drink.id);

    try {
      const real = await bookingsApi.create(drink.id);
      // Platzhalter durch echte Buchung ersetzen
      setBookings((prev) => prev.map((b) => (b.id === optimisticId ? real : b)));
      showToast(`${drink.name} gebucht – ${formatCents(real.price_cents_snapshot)}`, 'success');
    } catch (err) {
      // Optimistischen Eintrag rückgängig machen
      setBookings((prev) => prev.filter((b) => b.id !== optimisticId));
      const msg =
        err instanceof ApiError ? err.message : 'Buchung fehlgeschlagen. Bitte versuche es erneut.';
      showToast(msg, 'error');
    } finally {
      setBookingDrinkId(null);
    }
  }

  // -- Storno ---------------------------------------------------------------

  async function handleVoid(bookingId: number) {
    setVoidingId(bookingId);
    try {
      const updated = await bookingsApi.void(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      showToast('Buchung wurde storniert.', 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Stornierung fehlgeschlagen.';
      showToast(msg, 'error');
    } finally {
      setVoidingId(null);
    }
  }

  // -- Tages-Summe ----------------------------------------------------------

  const todayTotal = bookings
    .filter(
      (b) =>
        b.voided_at === null && new Date(b.booked_at).getTime() > Date.now() - 24 * 60 * 60 * 1000,
    )
    .reduce((sum, b) => sum + b.price_cents_snapshot, 0);

  // -------------------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* Getränke-Buttons */}
      <section aria-labelledby="drinks-heading">
        <h2 id="drinks-heading" className="mb-4 text-lg font-bold text-slate-800 dark:text-white">
          Getränk buchen
        </h2>

        {isLoadingDrinks ? (
          <div className="flex justify-center py-12">
            <Spinner size="h-10 w-10" />
          </div>
        ) : drinks.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">Keine Getränke verfügbar.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {drinks.map((drink) => {
              const isBooking = bookingDrinkId === drink.id;
              return (
                <button
                  key={drink.id}
                  onClick={() => void handleBook(drink)}
                  disabled={bookingDrinkId !== null}
                  aria-label={`${drink.name} buchen, ${formatCents(drink.current_price_cents ?? 0)}`}
                  className="relative flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-blue-100 bg-white px-3 py-4 font-semibold text-slate-800 shadow-sm transition-all hover:border-blue-400 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {isBooking ? (
                    <Spinner size="h-6 w-6" label={`${drink.name} wird gebucht…`} />
                  ) : (
                    <>
                      <span className="text-base">{drink.name}</span>
                      {drink.current_price_cents !== null && (
                        <span className="text-sm font-normal text-blue-600 dark:text-blue-400">
                          {formatCents(drink.current_price_cents)}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Buchungshistorie */}
      <section aria-labelledby="history-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="history-heading" className="text-lg font-bold text-slate-800 dark:text-white">
            Buchungen heute
          </h2>
          {todayTotal > 0 && (
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Gesamt: {formatCents(todayTotal)}
            </span>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {isLoadingBookings ? (
            <div className="flex justify-center py-8">
              <Spinner size="h-8 w-8" />
            </div>
          ) : (
            <BookingHistory
              bookings={bookings}
              drinks={drinks}
              onVoid={(id) => void handleVoid(id)}
              voidingId={voidingId}
            />
          )}
        </div>
      </section>
    </div>
  );
}
