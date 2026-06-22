import { useCallback, useEffect, useMemo, useState } from 'react';
import { bookingsApi } from '../api/bookings.js';
import { drinksApi } from '../api/drinks.js';
import { membersApi } from '../api/members.js';
import { ApiError } from '../api/client.js';
import { useToast } from '../contexts/ToastContext.js';
import Spinner from '../components/Spinner.js';
import SaldoCard from '../components/SaldoCard.js';
import SortenButton, { formatCents } from '../components/SortenButton.js';
import SectionTitle from '../components/SectionTitle.js';
import StrichHistory from '../components/StrichHistory.js';
import type {
  BookingRow,
  DrinkWithCurrentPrice,
  MemberStatus,
  PublicMember,
} from '../types/api.js';

// ---------------------------------------------------------------------------
// Kategorie-Reihenfolge & -Beschriftung
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: MemberStatus[] = ['aktiv', 'inaktiv', 'alter_herr', 'freund'];

const CATEGORY_LABEL: Record<MemberStatus, string> = {
  aktiv: 'Aktive',
  inaktiv: 'Inaktive',
  alter_herr: 'Alte Herren',
  freund: 'Freunde der Verbindung',
};

// ---------------------------------------------------------------------------
// Mitglieds-Kachel
// ---------------------------------------------------------------------------

function MemberTile({ member, onSelect }: { member: PublicMember; onSelect(): void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        minHeight: 56,
        width: '100%',
        padding: '14px 16px',
        borderRadius: 'var(--r-3)',
        border: '1px solid var(--line)',
        background: 'var(--bg-card)',
        boxShadow: 'var(--sh-1)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-sans)',
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--tinte)',
        transition: 'transform 150ms var(--ease-stempel)',
        transform: pressed ? 'scale(.985)' : 'none',
      }}
    >
      {member.display_name}
    </button>
  );
}

// ---------------------------------------------------------------------------
// View 1 — Mitglied auswählen
// ---------------------------------------------------------------------------

function MemberSelectView({ onSelect }: { onSelect(member: PublicMember): void }) {
  const { showToast } = useToast();
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    membersApi
      .getBookable()
      .then(setMembers)
      .catch(() => showToast('Mitgliederliste konnte nicht geladen werden.', 'error'))
      .finally(() => setIsLoading(false));
  }, [showToast]);

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? members.filter((m) => m.display_name.toLowerCase().includes(term))
      : members;
    const map = new Map<MemberStatus, PublicMember[]>();
    for (const m of filtered) {
      const list = map.get(m.member_status) ?? [];
      list.push(m);
      map.set(m.member_status, list);
    }
    return map;
  }, [members, search]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <Spinner size="h-10 w-10" />
      </div>
    );
  }

  const hasResults = CATEGORY_ORDER.some((cat) => (grouped.get(cat)?.length ?? 0) > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Mitglied suchen…"
        aria-label="Mitglied suchen"
        style={{
          width: '100%',
          minHeight: 48,
          padding: '12px 16px',
          borderRadius: 'var(--r-3)',
          border: '1px solid var(--line)',
          background: 'var(--bg-card)',
          fontFamily: 'var(--font-sans)',
          fontSize: 16,
          color: 'var(--tinte)',
        }}
      />

      {!hasResults ? (
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
          Niemand gefunden.
        </p>
      ) : (
        CATEGORY_ORDER.map((cat) => {
          const list = grouped.get(cat);
          if (!list || list.length === 0) return null;
          return (
            <section key={cat}>
              <SectionTitle>{CATEGORY_LABEL[cat]}</SectionTitle>
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}
                className="sm:grid-cols-3"
              >
                {list.map((m) => (
                  <MemberTile key={m.id} member={m} onSelect={() => onSelect(m)} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// View 2 — Für ausgewähltes Mitglied buchen
// ---------------------------------------------------------------------------

function MemberBookingView({ member, onDone }: { member: PublicMember; onDone(): void }) {
  const { showToast } = useToast();

  const [drinks, setDrinks] = useState<DrinkWithCurrentPrice[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [isLoadingDrinks, setIsLoadingDrinks] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [bookingDrinkId, setBookingDrinkId] = useState<number | null>(null);
  const [voidingId, setVoidingId] = useState<number | null>(null);

  useEffect(() => {
    drinksApi
      .getAvailable()
      .then(setDrinks)
      .catch(() => showToast('Getränkeliste konnte nicht geladen werden.', 'error'))
      .finally(() => setIsLoadingDrinks(false));
  }, [showToast]);

  const loadBookings = useCallback(() => {
    bookingsApi
      .getForMember(member.id, 200)
      .then((res) => setBookings(res.items))
      .catch(() => showToast('Striche konnten nicht geladen werden.', 'error'))
      .finally(() => setIsLoadingBookings(false));
  }, [member.id, showToast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function handleBook(drink: DrinkWithCurrentPrice) {
    if (bookingDrinkId !== null) return;
    setBookingDrinkId(drink.id);
    try {
      const real = await bookingsApi.createForMember(member.id, drink.id);
      setBookings((prev) => [real, ...prev]);
      showToast(
        `${drink.name} für ${member.display_name} gebucht — ${formatCents(real.price_cents_snapshot)}`,
        'success',
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Strich konnte nicht gesetzt werden.';
      showToast(msg, 'error');
    } finally {
      setBookingDrinkId(null);
    }
  }

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

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const monthBookings = bookings.filter(
    (b) => b.voided_at === null && new Date(b.booked_at).getTime() >= startOfMonth,
  );
  const monthTotal = monthBookings.reduce((sum, b) => sum + b.price_cents_snapshot, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <button
        onClick={onDone}
        style={{
          alignSelf: 'flex-start',
          minHeight: 36,
          padding: '4px 0',
          border: 'none',
          background: 'transparent',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--tinte-3)',
          cursor: 'pointer',
        }}
      >
        ‹ Zurück zur Übersicht
      </button>

      {!isLoadingBookings && (
        <SaldoCard
          balanceCents={monthTotal}
          stricheMonat={monthBookings.length}
          label={member.display_name}
          subline="Theken-Buchung"
        />
      )}

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
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}
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

      <section aria-labelledby="history-heading">
        <SectionTitle>
          <span id="history-heading">Striche diesen Monat</span>
        </SectionTitle>
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

      <button
        onClick={onDone}
        style={{
          minHeight: 52,
          width: '100%',
          borderRadius: 'var(--r-3)',
          border: 'none',
          background: 'var(--korps-rot)',
          color: '#fff',
          fontFamily: 'var(--font-sans)',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          boxShadow: 'var(--sh-2)',
        }}
      >
        Fertig
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Theken-Seite — schaltet zwischen Auswahl und Buchung um
// ---------------------------------------------------------------------------

export default function ThekePage() {
  const [selected, setSelected] = useState<PublicMember | null>(null);

  return selected ? (
    <MemberBookingView member={selected} onDone={() => setSelected(null)} />
  ) : (
    <MemberSelectView onSelect={setSelected} />
  );
}
