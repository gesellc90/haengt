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
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
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
// Abschnitts-Titel (Eyebrow-Stil, konsistent mit Stube)
// ---------------------------------------------------------------------------

function SectionTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
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
        showToast('Striche konnten nicht geladen werden.', 'error');
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

  // -- Monatssumme ----------------------------------------------------------

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

  const drinkNameMap = new Map(drinks.map((d) => [d.id, d.name]));

  // -------------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ------------------------------------------------------------------ */}
      {/* Profil-Karte                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--r-3)',
          border: '1px solid var(--line)',
          padding: '20px',
          boxShadow: 'var(--sh-1)',
        }}
      >
        <SectionTitle>Profil</SectionTitle>
        <dl style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Name', value: member?.display_name },
            { label: 'Kürzel', value: member?.username },
            { label: 'Rolle', value: member?.role === 'admin' ? 'Vorstand' : 'Mitglied' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: 12 }}>
              <dt
                style={{
                  width: 80,
                  flexShrink: 0,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--tinte-3)',
                  letterSpacing: '0.04em',
                  paddingTop: 1,
                }}
              >
                {label}
              </dt>
              <dd
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  color: 'var(--tinte)',
                  margin: 0,
                }}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Monatsabschluss                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--r-3)',
          border: '1px solid var(--line)',
          padding: '20px',
          boxShadow: 'var(--sh-1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Korps-Rot-Streifen oben */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'var(--korps-rot)',
          }}
        />

        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--tinte-3)',
            margin: '0 0 6px',
          }}
        >
          {monthLabel}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1,
            color: monthTotal > 0 ? 'var(--korps-rot)' : 'var(--erfolg)',
            margin: '0 0 4px',
            letterSpacing: '-0.01em',
          }}
        >
          {formatCents(monthTotal)}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--tinte-3)',
            margin: 0,
          }}
        >
          {thisMonth.length === 0
            ? 'Noch keine Striche diesen Monat.'
            : `${thisMonth.length} ${thisMonth.length === 1 ? 'Strich' : 'Striche'} diesen Monat`}
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Buchungshistorie                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="history-heading">
        <SectionTitle id="history-heading">Meine Striche</SectionTitle>

        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--r-3)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--sh-1)',
          }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <Spinner size="h-10 w-10" />
            </div>
          ) : bookings.length === 0 ? (
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
              Noch keine Striche verzeichnet.
            </p>
          ) : (
            <>
              <ul style={{ margin: 0, padding: '0 16px', listStyle: 'none' }}>
                {bookings.map((b, i) => {
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
                          }}
                        >
                          {drinkNameMap.get(b.drink_id) ?? `Getränk #${b.drink_id}`}
                        </p>
                        <p
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12,
                            color: 'var(--tinte-4)',
                            margin: '2px 0 0',
                          }}
                        >
                          {formatDateTime(b.booked_at)}
                          {voided && ' · storniert'}
                        </p>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 15,
                          fontWeight: 600,
                          color: 'var(--tinte-2)',
                          flexShrink: 0,
                        }}
                      >
                        {formatCents(b.price_cents_snapshot)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {hasMore && (
                <div
                  style={{
                    borderTop: '1px solid var(--line)',
                    padding: '12px 16px',
                  }}
                >
                  <button
                    onClick={() => void handleLoadMore()}
                    disabled={isLoadingMore}
                    style={{
                      minHeight: 44,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: 'none',
                      border: 'none',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: isLoadingMore ? 'var(--tinte-4)' : 'var(--korps-rot)',
                      cursor: isLoadingMore ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {isLoadingMore ? (
                      <>
                        <Spinner size="h-4 w-4" />
                        Lädt…
                      </>
                    ) : (
                      'Weitere Striche laden'
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
