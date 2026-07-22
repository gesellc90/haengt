import { useEffect, useMemo, useState } from 'react';
import { membersApi } from '../api/members.js';
import { ApiError } from '../api/client.js';
import { useToast } from '../contexts/ToastContext.js';
import Spinner from '../components/Spinner.js';
import SectionTitle from '../components/SectionTitle.js';
import { isMemberStruck } from '../types/api.js';
import type { MemberStatus, PublicMember } from '../types/api.js';

// ---------------------------------------------------------------------------
// Kategorie-Reihenfolge & -Beschriftung (wie in der Theken-Auswahl)
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: MemberStatus[] = ['aktiv', 'inaktiv', 'alter_herr', 'freund'];

const CATEGORY_LABEL: Record<MemberStatus, string> = {
  aktiv: 'Aktive',
  inaktiv: 'Inaktive',
  alter_herr: 'Alte Herren',
  freund: 'Freunde der Verbindung',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Button-Styles
// ---------------------------------------------------------------------------

const btnStrike: React.CSSProperties = {
  minHeight: 40,
  padding: '8px 14px',
  borderRadius: 'var(--r-2)',
  border: '1px solid var(--korps-rot)',
  background: 'transparent',
  color: 'var(--korps-rot)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const btnUnstrike: React.CSSProperties = {
  minHeight: 40,
  padding: '8px 14px',
  borderRadius: 'var(--r-2)',
  border: 'none',
  background: 'var(--korps-rot)',
  color: '#fff',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

// ---------------------------------------------------------------------------
// Mitglieds-Zeile
// ---------------------------------------------------------------------------

function MemberRow({
  member,
  busy,
  onStrike,
  onUnstrike,
}: {
  member: PublicMember;
  busy: boolean;
  onStrike(): void;
  onUnstrike(): void;
}) {
  const struck = isMemberStruck(member);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: 56,
        padding: '10px 16px',
        borderRadius: 'var(--r-3)',
        border: '1px solid var(--line)',
        background: 'var(--bg-card)',
        boxShadow: 'var(--sh-1)',
        opacity: struck ? 0.55 : 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--tinte)',
            textDecoration: struck ? 'line-through' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {member.display_name}
        </div>
        {struck && member.struck_until && (
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--korps-rot)',
              marginTop: 2,
            }}
          >
            gestrichen bis {formatDate(member.struck_until)}
          </div>
        )}
      </div>

      {struck ? (
        <button
          onClick={onUnstrike}
          disabled={busy}
          style={{ ...btnUnstrike, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? <Spinner size="h-3 w-3" /> : 'Entstreichen'}
        </button>
      ) : (
        <button
          onClick={onStrike}
          disabled={busy}
          style={{ ...btnStrike, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? <Spinner size="h-3 w-3" /> : 'Streichen'}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Streichen-Seite (Wirtschaftskommission / Admin)
// ---------------------------------------------------------------------------

export default function StreichenPage() {
  const { showToast } = useToast();
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    membersApi
      .getStrikeable()
      .then(setMembers)
      .catch(() => showToast('Kontenliste konnte nicht geladen werden.', 'error'))
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

  function replaceMember(updated: PublicMember) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  async function handleStrike(member: PublicMember) {
    if (
      !confirm(
        `${member.display_name} streichen? Für die nächsten 2 Wochen können keine Getränke auf dieses Konto gebucht werden.`,
      )
    ) {
      return;
    }
    setBusyId(member.id);
    try {
      const updated = await membersApi.strike(member.id);
      replaceMember(updated);
      showToast(`${member.display_name} wurde gestrichen.`, 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Streichen fehlgeschlagen.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnstrike(member: PublicMember) {
    setBusyId(member.id);
    try {
      const updated = await membersApi.unstrike(member.id);
      replaceMember(updated);
      showToast(`${member.display_name} wurde entstrichen.`, 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Entstreichen fehlgeschlagen.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const hasResults = CATEGORY_ORDER.some((cat) => (grouped.get(cat)?.length ?? 0) > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--tinte)',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          Wirtschaftskommission
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--tinte-3)',
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          Konten streichen und entstreichen
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="h-10 w-10" />
        </div>
      ) : (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Konto suchen…"
            aria-label="Konto suchen"
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
              Kein Konto gefunden.
            </p>
          ) : (
            CATEGORY_ORDER.map((cat) => {
              const list = grouped.get(cat);
              if (!list || list.length === 0) return null;
              return (
                <section key={cat}>
                  <SectionTitle>{CATEGORY_LABEL[cat]}</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {list.map((m) => (
                      <MemberRow
                        key={m.id}
                        member={m}
                        busy={busyId === m.id}
                        onStrike={() => void handleStrike(m)}
                        onUnstrike={() => void handleUnstrike(m)}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
