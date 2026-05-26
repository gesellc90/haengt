import { useCallback, useEffect, useState } from 'react';
import { bookingsApi } from '../api/bookings.js';
import { drinksApi } from '../api/drinks.js';
import { ApiError } from '../api/client.js';
import { useToast } from '../contexts/ToastContext.js';
import Spinner from '../components/Spinner.js';
import SaldoCard from '../components/SaldoCard.js';
import SortenButton from '../components/SortenButton.js';
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
// Strich-Historie
// ---------------------------------------------------------------------------

interface StrichHistoryProps {
  bookings: BookingRow[];
  drinks: DrinkWithCurrentPrice[];
  onVoid(bookingId: number): void;
  voidingId: number | null;
}

function StrichHistory({ bookings, drinks, onVoid, voidingId }: StrichHistoryProps) {
  const drinkMap = new Map(drinks.map((d) => [d.id, d]));
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recent = bookings.filter((b) => new Date(b.booked_at).getTime() > cutoff);

  if (recent.length === 0) {
    return (
      <p
        style={{
          padding: '24px 0',
          textAlign: 'center',
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 15,
          color: 'var(--tinte-4)',
        }}
      >
        Heute noch keine Striche gesetzt.
      </p>
    );
  }

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {recent.map((b, i) => {
        const drink = drinkMap.get(b.drink_id);
        const voided = b.voided_at !== null;
        return (
          <li
            key={b.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderTop: i > 0 ? '1px solid var(--line)' : 'none',
              opacity: voided ? 0.45 : 1,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--tinte)',
                  margin: 0,
                  textDecoration: voided ? 'line-through' : 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {drink?.name ?? `Getränk #${b.drink_id}`}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: 'var(--tinte-4)',
                  margin: '2px 0 0',
                }}
              >
                {formatTime(b.booked_at)}
                {voided && ' · storniert'}
              </p>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--tinte-2)',
                flexShrink: 0,
              }}
            >
              {formatCents(b.price_cents_snapshot)}
            </span>
            {!voided && isVoidable(b) && (
              <button
                onClick={() => onVoid(b.id)}
                disabled={voidingId === b.id}
                aria-label="Strich stornieren"
                style={{
                  minHeight: 36,
                  flexShrink: 0,
                  padding: '4px 12px',
                  borderRadius: 'var(--r-2)',
                  border: '1px solid var(--korps-rot)',
                  background: 'transparent',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--korps-rot)',
                  cursor: voidingId === b.id ? 'not-allowed' : 'pointer',
                  opacity: voidingId === b.id ? 0.5 : 1,
                  letterSpacing: '0.03em',
                }}
              >
                {voidingId === b.id ? <Spinner size="h-3 w-3" /> : 'Stornieren'}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Abschnitts-Titel (Eyebrow-Stil)
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--tinte-3)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        margin: '0 0 12px',
        paddingBottom: 6,
        borderBottom: '2px solid var(--korps-rot)',
        display: 'inline-block',
      }}
    >
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Komponente — Stube
// ---------------------------------------------------------------------------

export default function BookingPage() {
  const { showToast } = useToast();

  const [drinks, setDrinks] = useState<DrinkWithCurrentPrice[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [isLoadingDrinks, setIsLoadingDrinks] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  const [bookingDrinkId, setBookingDrinkId] = useState<number | null>(null);
  const [voidingId, setVoidingId] = useState<number | null>(null);

  // -- Daten laden ----------------------------------------------------------

  useEffect(() => {
    drinksApi
      .getAvailable()
      .then(setDrinks)
      .catch(() => showToast('Getränkeliste konnte nicht geladen werden.', 'error'))
      .finally(() => setIsLoadingDrinks(false));
  }, [showToast]);

  const loadBookings = useCallback(() => {
    bookingsApi
      .getMine(50)
      .then((res) => setBookings(res.items))
      .catch(() => showToast('Striche konnten nicht geladen werden.', 'error'))
      .finally(() => setIsLoadingBookings(false));
  }, [showToast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // -- Strich setzen --------------------------------------------------------

  async function handleBook(drink: DrinkWithCurrentPrice) {
    if (bookingDrinkId !== null) return;

    const optimisticId = -Date.now();
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
      setBookings((prev) => prev.map((b) => (b.id === optimisticId ? real : b)));
      showToast(`${drink.name} gebucht — ${formatCents(real.price_cents_snapshot)}`, 'success');
    } catch (err) {
      setBookings((prev) => prev.filter((b) => b.id !== optimisticId));
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Strich konnte nicht gesetzt werden. Bitte erneut versuchen.';
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
      showToast('Strich wurde storniert.', 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Stornierung fehlgeschlagen.';
      showToast(msg, 'error');
    } finally {
      setVoidingId(null);
    }
  }

  // -- Tages-Summe ----------------------------------------------------------

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const todayBookings = bookings.filter(
    (b) => b.voided_at === null && new Date(b.booked_at).getTime() > cutoff,
  );
  const todayTotal = todayBookings.reduce((sum, b) => sum + b.price_cents_snapshot, 0);

  // -------------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Saldo-Karte */}
      {!isLoadingBookings && (
        <SaldoCard
          balanceCents={todayTotal}
          stricheHeute={todayBookings.length}
        />
      )}

      {/* Getränke-Kacheln */}
      <section aria-labelledby="sorten-heading">
        <SectionTitle>
          <span id="sorten-heading">Strich setzen</span>
        </SectionTitle>

        {isLoadingDrinks ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spinner size="h-10 w-10" />
          </div>
        ) : drinks.length === 0 ? (
          <p
            style={{
              padding: '40px 0',
              textAlign: 'center',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 15,
              color: 'var(--tinte-4)',
            }}
          >
            Keine Getränke verfügbar.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
            className="sm:grid-cols-3"
          >
            {drinks.map((drink) => (
              <SortenButton
                key={drink.id}
                name={drink.name}
                priceCents={drink.current_price_cents ?? 0}
                onClick={() => void handleBook(drink)}
                disabled={bookingDrinkId !== null}
                isLoading={bookingDrinkId === drink.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Strich-Historie */}
      <section aria-labelledby="history-heading">
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <SectionTitle>
            <span id="history-heading">Striche heute</span>
          </SectionTitle>
          {todayTotal > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--tinte-3)',
              }}
            >
              {formatCents(todayTotal)}
            </span>
          )}
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--r-3)',
            border: '1px solid var(--line)',
            padding: '0 16px',
            boxShadow: 'var(--sh-1)',
          }}
        >
          {isLoadingBookings ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <Spinner size="h-8 w-8" />
            </div>
          ) : (
            <StrichHistory
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
