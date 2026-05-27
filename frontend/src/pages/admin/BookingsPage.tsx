import { useCallback, useEffect, useState } from 'react';
import { bookingsApi } from '../../api/bookings.js';
import { drinksApi } from '../../api/drinks.js';
import { membersApi } from '../../api/members.js';
import { ApiError } from '../../api/client.js';
import { useToast } from '../../contexts/ToastContext.js';
import Spinner from '../../components/Spinner.js';
import type { BookingRow, DrinkRow, PublicMember } from '../../types/api.js';

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
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const inputStyle: React.CSSProperties = {
  minHeight: 44,
  padding: '8px 12px',
  borderRadius: 'var(--r-2)',
  border: '1px solid var(--line-2)',
  background: 'var(--bg)',
  color: 'var(--tinte)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  /* outline via globales :focus-visible (korps-rot) */
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--tinte-3)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 5,
};

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export default function AdminBookingsPage() {
  const { showToast } = useToast();

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [drinkRows, setDrinkRows] = useState<DrinkRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [voidingId, setVoidingId] = useState<number | null>(null);

  const [filterMemberId, setFilterMemberId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterIncludeVoided, setFilterIncludeVoided] = useState(false);

  useEffect(() => {
    membersApi
      .getAll(true)
      .then(setMembers)
      .catch(() => undefined);
    drinksApi
      .getAll()
      .then(setDrinkRows)
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await bookingsApi.getAll({
        member_id: filterMemberId ? Number(filterMemberId) : undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
        include_voided: filterIncludeVoided,
        limit: 200,
      });
      setBookings(data);
    } catch {
      showToast('Buchungen konnten nicht geladen werden.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filterMemberId, filterFrom, filterTo, filterIncludeVoided, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleVoid(bookingId: number) {
    if (!confirm('Buchung wirklich stornieren?')) return;
    setVoidingId(bookingId);
    try {
      const updated = await bookingsApi.void(bookingId, 'Admin-Storno');
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      showToast('Buchung storniert.', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Fehler.', 'error');
    } finally {
      setVoidingId(null);
    }
  }

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const drinkMap = new Map(drinkRows.map((d) => [d.id, d.name]));
  const total = bookings
    .filter((b) => b.voided_at === null)
    .reduce((s, b) => s + b.price_cents_snapshot, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter-Leiste */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          borderRadius: 'var(--r-3)',
          border: '1px solid var(--line)',
          background: 'var(--bg-card)',
          padding: 16,
        }}
      >
        <div style={{ flex: '1 1 160px' }}>
          <label style={labelStyle}>Mitglied</label>
          <select
            value={filterMemberId}
            onChange={(e) => setFilterMemberId(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          >
            <option value="">Alle</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Von</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Bis</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 44,
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--tinte-3)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={filterIncludeVoided}
              onChange={(e) => setFilterIncludeVoided(e.target.checked)}
            />
            Stornierte einblenden
          </label>
        </div>
      </div>

      {/* Summe */}
      {!isLoading && bookings.length > 0 && (
        <p
          style={{
            textAlign: 'right',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--tinte-3)',
          }}
        >
          Summe (aktiv): {formatCents(total)} · {bookings.length}{' '}
          {bookings.length !== 1 ? 'Buchungen' : 'Buchung'}
        </p>
      )}

      {/* Tabelle */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="h-10 w-10" />
        </div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            borderRadius: 'var(--r-3)',
            border: '1px solid var(--line)',
            background: 'var(--bg-card)',
            boxShadow: 'var(--sh-1)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Mitglied', 'Getränk', 'Zeitpunkt', 'Preis', 'Status', 'Aktionen'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--tinte-3)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid var(--line)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => {
                const member = memberMap.get(b.member_id);
                const voided = b.voided_at !== null;
                return (
                  <tr
                    key={b.id}
                    style={{
                      opacity: voided ? 0.4 : 1,
                      borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <td
                      style={{
                        padding: '10px 16px',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 600,
                        color: 'var(--tinte)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {member?.display_name ?? `#${b.member_id}`}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        color: 'var(--tinte-3)',
                        fontFamily: 'var(--font-sans)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {drinkMap.get(b.drink_id) ?? `#${b.drink_id}`}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        color: 'var(--tinte-3)',
                        fontFamily: 'var(--font-sans)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDateTime(b.booked_at)}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        fontFamily: 'var(--font-serif)',
                        fontWeight: 600,
                        color: 'var(--tinte-2)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCents(b.price_cents_snapshot)}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {voided ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 'var(--r-pill)',
                            border: '1px solid var(--line-2)',
                            background: 'var(--bg-2)',
                            color: 'var(--tinte-4)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          Storniert
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 'var(--r-pill)',
                            border: '1px solid var(--erfolg)',
                            background: 'var(--erfolg-bg)',
                            color: 'var(--erfolg)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          Aktiv
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {!voided && (
                        <button
                          onClick={() => void handleVoid(b.id)}
                          disabled={voidingId === b.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            minHeight: 32,
                            padding: '3px 10px',
                            borderRadius: 'var(--r-1)',
                            border: '1px solid var(--korps-rot)',
                            background: 'transparent',
                            color: 'var(--korps-rot)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: voidingId === b.id ? 'not-allowed' : 'pointer',
                            opacity: voidingId === b.id ? 0.5 : 1,
                          }}
                        >
                          {voidingId === b.id ? <Spinner size="h-3 w-3" /> : 'Stornieren'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {bookings.length === 0 && (
            <p
              style={{
                padding: '40px 0',
                textAlign: 'center',
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--tinte-4)',
              }}
            >
              Keine Buchungen gefunden.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
