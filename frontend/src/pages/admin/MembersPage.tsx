import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { membersApi } from '../../api/members.js';
import { ApiError } from '../../api/client.js';
import { useToast } from '../../contexts/ToastContext.js';
import Spinner from '../../components/Spinner.js';
import type { PublicMember } from '../../types/api.js';

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
      <button
        onClick={() => setOpen(true)}
        className="min-h-touch rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        + Mitglied anlegen
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30"
    >
      <h3 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">Neues Mitglied</h3>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(['display_name', 'username', 'password'] as const).map((field) => (
          <div key={field}>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              {field === 'display_name'
                ? 'Anzeigename'
                : field === 'username'
                  ? 'Benutzername'
                  : 'Passwort'}
            </label>
            <input
              type={field === 'password' ? 'password' : 'text'}
              name={field}
              required
              value={form[field]}
              onChange={handleChange}
              className="min-h-touch w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Rolle
          </label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="min-h-touch w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            <option value="member">Mitglied</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-touch flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending && <Spinner size="h-3 w-3" />}
          Anlegen
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-touch rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
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
      showToast('Passwort wurde zurückgesetzt.', 'success');
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Fehler.', 'error');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-2 flex items-center gap-2">
      <input
        type="password"
        required
        minLength={8}
        placeholder="Neues Passwort (mind. 8 Zeichen)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="min-h-touch flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      />
      <button
        type="submit"
        disabled={isPending || password.length < 8}
        className="min-h-touch rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? <Spinner size="h-3 w-3" /> : 'Speichern'}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="min-h-touch rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600"
      >
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CreateMemberForm onCreated={(m) => setMembers((prev) => [m, ...prev])} />
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded"
          />
          Inaktive anzeigen
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="h-10 w-10" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-slate-700">
                {['Anzeigename', 'Benutzername', 'Rolle', 'Status', 'Aktionen'].map((h) => (
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
              {members.map((m) => (
                <>
                  <tr key={m.id} className={m.is_active === 0 ? 'opacity-40' : ''}>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">
                      {m.display_name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{m.username}</td>
                    <td className="px-4 py-3 capitalize text-slate-500">{m.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {m.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => setResetId(resetId === m.id ? null : m.id)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400"
                        >
                          PW zurücksetzen
                        </button>
                        {m.is_active === 1 && (
                          <button
                            onClick={() => void handleDeactivate(m.id, m.display_name)}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                          >
                            Deaktivieren
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {resetId === m.id && (
                    <tr key={`${m.id}-reset`}>
                      <td colSpan={5} className="px-4 pb-3">
                        <ResetPasswordForm memberId={m.id} onClose={() => setResetId(null)} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {members.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">Keine Mitglieder gefunden.</p>
          )}
        </div>
      )}
    </div>
  );
}
