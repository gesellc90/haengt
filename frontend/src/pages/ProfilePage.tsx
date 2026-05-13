import { useCallback, useEffect, useState } from 'react';
import { bookingsApi } from '../api/bookings.js';
import { drinksApi } from '../api/drinks.js';
import { useAuth } from '../contexts/AuthContext.js';
import { useToast } from '../contexts/ToastContext.js';
import Spinner from '../components/Spinner.js';
import type { BookingRow, DrinkWithCurrentPrice } from '../types/api.js';

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Komponente
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const { member } = useAuth();
  const { showToast } = useToast();

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [drinks, setDrinks] = useState<DrinkWithCurrentPrice[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Getränke für Namens-Mapping laden (verfügbare + ggf. deaktivierte via Fallback)
  useEffect(() => {
    drinksApi
      .getAvailable()
      .then(setDrinks)
      .catch(() => undefined);
  }, []);

  const loadBookings = useCallback(
    async (beforeId?: number) => {
      try {
        const res = await bookingsApi.getMine(50, beforeId);
        if (beforeId === undefined) {
          setBookings(res.items);
        } else {
          setBookings((prev) => [...prev, ...res.items]);
        }
        setHasMore(res.hasMore);
      } catch {
        showToast('Buchungen konnten nicht geladen werden.', 'error');
      }
    },
    [showToast],
  );

  useEffect(() => {
    loadBookings()
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [loadBookings]);

  async function handleLoadMore() {
    const lastId = bookings[bookings.length - 1]?.id;
    if (!lastId) return;
    setIsLoadingMore(true);
    await loadBookings(lastId).catch(() => undefined);
    setIsLoadingMore(false);
  }

  // -- Monatssumme (aktueller Monat) ----------------------------------------

  const now = new Date();
  const thisMonth = bookings.filter((b) => {
    const d = new Date(b.booked_at);
    return (
      b.voided_at === null &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  });
  const monthTotal = thisMonth.reduce((sum, b) => sum + b.price_cents_snapshot, 0);
  const monthLabel = now.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

  // Drink-ID → Name (deaktivierte Getränke fallen auf "Getränk #ID" zurück)
  const drinkNameMap = new Map(drinks.map((d) => [d.id, d.name]));

  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Profil-Karte */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-3 text-lg font-bold text-slate-800 dark:text-white">Mein Profil</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-36 shrink-0 font-medium text-slate-500 dark:text-slate-400">Name</dt>
            <dd className="text-slate-800 dark:text-white">{member?.display_name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-36 shrink-0 font-medium text-slate-500 dark:text-slate-400">
              Benutzername
            </dt>
            <dd className="text-slate-800 dark:text-white">{member?.username}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-36 shrink-0 font-medium text-slate-500 dark:text-slate-400">Rolle</dt>
            <dd className="text-slate-800 dark:text-white capitalize">{member?.role}</dd>
          </div>
        </dl>
      </section>

      {/* Monatssumme */}
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{monthLabel}</p>
        <p className="mt-1 text-3xl font-bold text-blue-800 dark:text-blue-100">
          {formatCents(monthTotal)}
        </p>
        <p className="mt-1 text-xs text-blue-500 dark:text-blue-400">
          {thisMonth.length} Buchung{thisMonth.length !== 1 ? 'en' : ''}
        </p>
      </section>

      {/* Buchungshistorie */}
      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-3 text-lg font-bold text-slate-800 dark:text-white">
          Meine Buchungen
        </h2>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="h-10 w-10" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Noch keine Buchungen.</p>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 px-4 dark:divide-slate-700">
                {bookings.map((b) => {
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
                          {drinkNameMap.get(b.drink_id) ?? `Getränk #${b.drink_id}`}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDateTime(b.booked_at)}
                          {voided && ' · storniert'}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {formatCents(b.price_cents_snapshot)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {hasMore && (
                <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-700">
                  <button
                    onClick={() => void handleLoadMore()}
                    disabled={isLoadingMore}
                    className="min-h-touch flex w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  >
                    {isLoadingMore ? (
                      <>
                        <Spinner size="h-4 w-4" />
                        Lädt…
                      </>
                    ) : (
                      'Weitere laden'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
