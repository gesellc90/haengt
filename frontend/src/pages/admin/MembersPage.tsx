import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { membersApi } from '../../api/members.js';
import { ApiError } from '../../api/client.js';
import { useToast } from '../../contexts/ToastContext.js';
import Spinner from '../../components/Spinner.js';
import type { PublicMember } from '../../types/api.js';

// ---------------------------------------------------------------------------
// Gemeinsame Styles
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '8px 12px',
  borderRadius: 'var(--r-2)',
  border: '1px solid var(--line-2)',
  background: 'var(--bg)',
  color: 'var(--tinte)',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  /* outline via globales :focus-visible (korps-rot) */
  boxSizing: 'border-box',
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

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 44,
  padding: '8px 16px',
  borderRadius: 'var(--r-2)',
  border: 'none',
  background: 'var(--korps-rot)',
  color: 'var(--kreide)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  letterSpacing: '0.03em',
};

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 44,
  padding: '8px 16px',
  borderRadius: 'var(--r-2)',
  border: '1px solid var(--line-2)',
  background: 'transparent',
  color: 'var(--tinte-2)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 36,
  padding: '4px 10px',
  borderRadius: 'var(--r-1)',
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--tinte-3)',
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  ...btnGhost,
  border: '1px solid var(--korps-rot)',
  color: 'var(--korps-rot)',
};

// ---------------------------------------------------------------------------
// Neues-Mitglied-Formular
// ---------------------------------------------------------------------------

interface CreateMemberFormProps {
  onCreated(member: PublicMember): void;
}

function CreateMemberForm({ onCreated }: CreateMemberFormProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [form, setForm] = useState({
    username: '',
    display_name: '',
    password: '',
    role: 'member' as 'admin' | 'member',
  });
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const member = await membersApi.create(form);
      onCreated(member);
      setForm({ username: '', display_name: '', password: '', role: 'member' });
      setOpen(false);
      showToast(`${member.display_name} wurde angelegt.`, 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Anlegen.');
    } finally {
      setIsPending(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={btnPrimary}>
        + Mitglied anlegen
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{
        borderRadius: 'var(--r-3)',
        border: '1px solid var(--line)',
        background: 'var(--bg-card)',
        padding: 20,
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: 'var(--tinte)',
          margin: '0 0 14px',
          paddingBottom: 8,
          borderBottom: '2px solid var(--korps-rot)',
          display: 'inline-block',
        }}
      >
        Neues Mitglied
      </h3>

      {error && (
        <p
          role="alert"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--fehler)',
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ marginBottom: 14 }}>
        {(['display_name', 'username', 'password'] as const).map((field) => (
          <div key={field}>
            <label style={labelStyle}>
              {field === 'display_name' ? 'Name' : field === 'username' ? 'Kürzel' : 'Losungswort'}
            </label>
            <input
              type={field === 'password' ? 'password' : 'text'}
              name={field}
              required
              value={form[field]}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        ))}
        <div>
          <label style={labelStyle}>Rolle</label>
          <select name="role" value={form.role} onChange={handleChange} style={inputStyle}>
            <option value="member">Mitglied</option>
            <option value="admin">Vorstand</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={isPending}
          style={{ ...btnPrimary, opacity: isPending ? 0.6 : 1 }}
        >
          {isPending && <Spinner size="h-3 w-3" />}
          Anlegen
        </button>
        <button type="button" onClick={() => setOpen(false)} style={btnSecondary}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Passwort-Reset-Formular (inline)
// ---------------------------------------------------------------------------

interface ResetPasswordFormProps {
  memberId: number;
  onClose(): void;
}

function ResetPasswordForm({ memberId, onClose }: ResetPasswordFormProps) {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsPending(true);
    try {
      await membersApi.update(memberId, { password });
      showToast('Losungswort wurde zurückgesetzt.', 'success');
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Fehler.', 'error');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <input
        type="password"
        required
        minLength={8}
        placeholder="Neues Losungswort (mind. 8 Zeichen)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ ...inputStyle, flex: 1 }}
      />
      <button
        type="submit"
        disabled={isPending || password.length < 8}
        style={{ ...btnPrimary, opacity: isPending || password.length < 8 ? 0.5 : 1 }}
      >
        {isPending ? <Spinner size="h-3 w-3" /> : 'Speichern'}
      </button>
      <button type="button" onClick={onClose} style={btnSecondary}>
        ✕
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export default function MembersPage() {
  const { showToast } = useToast();
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resetId, setResetId] = useState<number | null>(null);

  const load = async (inactive: boolean) => {
    try {
      const data = await membersApi.getAll(inactive);
      setMembers(data);
    } catch {
      showToast('Mitglieder konnten nicht geladen werden.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load(includeInactive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  async function handleDeactivate(id: number, name: string) {
    if (!confirm(`${name} wirklich deaktivieren?`)) return;
    try {
      await membersApi.deactivate(id);
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, is_active: 0 } : m)));
      showToast(`${name} wurde deaktiviert.`, 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Fehler.', 'error');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <CreateMemberForm onCreated={(m) => setMembers((prev) => [m, ...prev])} />
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--tinte-3)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Inaktive anzeigen
        </label>
      </div>

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
                {['Name', 'Kürzel', 'Rolle', 'Status', 'Aktionen'].map((h) => (
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
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <>
                  <tr
                    key={m.id}
                    style={{
                      opacity: m.is_active === 0 ? 0.45 : 1,
                      borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <td
                      style={{
                        padding: '10px 16px',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 600,
                        color: 'var(--tinte)',
                      }}
                    >
                      {m.display_name}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        color: 'var(--tinte-3)',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {m.username}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        color: 'var(--tinte-3)',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {m.role === 'admin' ? 'Vorstand' : 'Mitglied'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 'var(--r-pill)',
                          border: `1px solid ${m.is_active ? 'var(--erfolg)' : 'var(--line-2)'}`,
                          background: m.is_active ? 'var(--erfolg-bg)' : 'var(--bg-2)',
                          color: m.is_active ? 'var(--erfolg)' : 'var(--tinte-4)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {m.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <button
                          onClick={() => setResetId(resetId === m.id ? null : m.id)}
                          style={btnGhost}
                        >
                          Losungswort
                        </button>
                        {m.is_active === 1 && (
                          <button
                            onClick={() => void handleDeactivate(m.id, m.display_name)}
                            style={btnDanger}
                          >
                            Deaktivieren
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {resetId === m.id && (
                    <tr key={`${m.id}-reset`}>
                      <td
                        colSpan={5}
                        style={{ padding: '4px 16px 14px', borderTop: '1px solid var(--line)' }}
                      >
                        <ResetPasswordForm memberId={m.id} onClose={() => setResetId(null)} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {members.length === 0 && (
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
              Keine Mitglieder gefunden.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
