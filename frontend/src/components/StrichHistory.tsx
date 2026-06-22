import Spinner from './Spinner.js';
import { formatCents } from './SortenButton.js';
import type { BookingRow, DrinkWithCurrentPrice } from '../types/api.js';

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/** Prüft ob eine Buchung noch innerhalb des 5-Minuten-Storno-Fensters liegt */
export function isVoidable(booking: BookingRow): boolean {
  if (booking.voided_at !== null) return false;
  const bookedAt = new Date(booking.booked_at).getTime();
  return Date.now() - bookedAt < 5 * 60 * 1000;
}

interface StrichHistoryProps {
  bookings: BookingRow[];
  drinks: DrinkWithCurrentPrice[];
  onVoid(bookingId: number): void;
  voidingId: number | null;
}

/** Liste der diesen Monat gesetzten Striche mit Storno-Option im 5-Minuten-Fenster */
export default function StrichHistory({ bookings, drinks, onVoid, voidingId }: StrichHistoryProps) {
  const drinkMap = new Map(drinks.map((d) => [d.id, d]));
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const recent = bookings.filter((b) => new Date(b.booked_at).getTime() >= startOfMonth);

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
        Diesen Monat noch keine Striche gesetzt.
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
