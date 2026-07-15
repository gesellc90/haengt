import { useCallback, useEffect, useState } from 'react';
import { bookingsApi } from '../api/bookings.js';
import { drinksApi } from '../api/drinks.js';
import { ApiError } from '../api/client.js';
import { useToast } from '../contexts/ToastContext.js';
import { useAuth } from '../contexts/AuthContext.js';
import Spinner from '../components/Spinner.js';
import SaldoCard from '../components/SaldoCard.js';
import SortenButton, { formatCents } from '../components/SortenButton.js';
import SectionTitle from '../components/SectionTitle.js';
import StrichHistory from '../components/StrichHistory.js';
import { groupDrinksByCategory } from '../utils/groupByCategory.js';
import { isMemberStruck } from '../types/api.js';
import type { BookingRow, DrinkWithCurrentPrice } from '../types/api.js';

// ---------------------------------------------------------------------------
// Kategorie-Überschrift innerhalb der Getränke-Auswahl
// ---------------------------------------------------------------------------

function CategoryHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--tinte-3)',
        margin: '0 0 8px',
      }}
    >
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Komponente — Stube
// ---------------------------------------------------------------------------

export default function BookingPage() {
  const { showToast } = useToast();
  const { member } = useAuth();

  const struck = member ? isMemberStruck(member) : false;
  const struckUntil =
    struck && member?.struck_until
      ? new Date(member.struck_until).toLocaleDateString('de-DE')
      : null;

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
      .getMine(200)
      .then((res) => setBookings(res.items))
      .catch(() => showToast('Striche konnten nicht geladen werden.', 'error'))
      .finally(() => setIsLoadingBookings(false));
  }, [showToast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // -- Strich setzen --------------------------------------------------------

  async function handleBook(drink: DrinkWithCurrentPrice) {
    if (bookingDrinkId !== null || struck) return;

    const optimisticId = -Date.now();
    const optimistic: BookingRow = {
      id: optimisticId,
      member_id: 0,
      drink_id: drink.id,
      price_cents_snapshot: drink.current_price_cents ?? 0,
      booked_at: new Date().toISOString(),
      voided_at: null,
      void_reason: null,
      booked_by_id: null,
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

  // -- Monats-Summe ---------------------------------------------------------

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const monthBookings = bookings.filter(
    (b) => b.voided_at === null && new Date(b.booked_at).getTime() >= startOfMonth,
  );
  const monthTotal = monthBookings.reduce((sum, b) => sum + b.price_cents_snapshot, 0);

  // -------------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Saldo-Karte */}
      {!isLoadingBookings && (
        <SaldoCard balanceCents={monthTotal} stricheMonat={monthBookings.length} />
      )}

      {/* Streich-Hinweis */}
      {struck && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--r-3)',
            border: '1px solid var(--korps-rot)',
            background: 'var(--erfolg-bg, transparent)',
            color: 'var(--korps-rot)',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Dein Konto ist gestrichen{struckUntil ? ` bis ${struckUntil}` : ''} – es können zurzeit
          keine Getränke gebucht werden.
        </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {groupDrinksByCategory(drinks).map((group) => (
              <div key={group.category_id}>
                <CategoryHeading>{group.category_name}</CategoryHeading>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 12,
                  }}
                  className="sm:grid-cols-3"
                >
                  {group.drinks.map((drink) => (
                    <SortenButton
                      key={drink.id}
                      name={drink.name}
                      priceCents={drink.current_price_cents ?? 0}
                      onClick={() => void handleBook(drink)}
                      disabled={bookingDrinkId !== null || struck}
                      isLoading={bookingDrinkId === drink.id}
                    />
                  ))}
                </div>
              </div>
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
            <span id="history-heading">Striche diesen Monat</span>
          </SectionTitle>
          {monthTotal > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--tinte-3)',
              }}
            >
              {formatCents(monthTotal)}
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
