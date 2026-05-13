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

  // -- Filter-State ----------------------------------------------------------
  const [filterMemberId, setFilterMemberId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterIncludeVoided, setFilterIncludeVoided] = useState(false);

  // Mitglieder + Getränke für Dropdown und Namens-Mapping laden
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
    <div className="space-y-4">
      {/* Filter-Leiste */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Mitglied</label>
          <select
            value={filterMemberId}
            onChange={(e) => setFilterMemberId(e.target.value)}
            className="min-h-touch w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
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
          <label className="mb-1 block text-xs font-medium text-slate-500">Von</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="min-h-touch rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Bis</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="min-h-touch rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div className="flex items-end">
          <label className="flex min-h-touch items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={filterIncludeVoided}
              onChange={(e) => setFilterIncludeVoided(e.target.checked)}
              className="rounded"
            />
            Stornierte einblenden
          </label>
        </div>
      </div>

      {/* Summe */}
      {!isLoading && bookings.length > 0 && (
        <p className="text-right text-sm font-semibold text-slate-600 dark:text-slate-400">
          Summe (aktiv): {formatCents(total)} · {bookings.length} Buchung
          {bookings.length !== 1 ? 'en' : ''}
        </p>
      )}

      {/* Tabelle */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="h-10 w-10" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-slate-700">
                {['Mitglied', 'Getränk', 'Zeitpunkt', 'Preis', 'Status', 'Aktionen'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {bookings.map((b) => {
                const member = memberMap.get(b.member_id);
                const voided = b.voided_at !== null;
                return (
                  <tr key={b.id} className={voided ? 'opacity-40' : ''}>
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                      {member?.display_name ?? `#${b.member_id}`}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {drinkMap.get(b.drink_id) ?? `#${b.drink_id}`}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDateTime(b.booked_at)}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                      {formatCents(b.price_cents_snapshot)}
                    </td>
                    <td className="px-4 py-2.5">
                      {voided ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          Storniert
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Aktiv
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {!voided && (
                        <button
                          onClick={() => void handleVoid(b.id)}
                          disabled={voidingId === b.id}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
                        >
                          {voidingId === b.id ? <Spinner size="h-3 w-3" /> : 'Storno'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {bookings.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">Keine Buchungen gefunden.</p>
          )}
        </div>
      )}
    </div>
  );
}
