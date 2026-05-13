import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { ApiError } from '../api/client.js';
import Spinner from '../components/Spinner.js';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Wenn bereits eingeloggt, direkt weiterleiten — <Navigate> statt navigate() im Render
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/buchen';
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Ungültige Zugangsdaten. Bitte prüfe Benutzername und Passwort.');
        } else if (err.status === 429) {
          setError('Zu viele Fehlversuche. Bitte warte 15 Minuten und versuche es erneut.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Verbindung zum Server fehlgeschlagen. Bitte versuche es später erneut.');
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-sm">
        {/* Logo / Titel */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-5xl">🍺</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Hängt!</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Jeder Strich zählt</p>
        </div>

        {/* Formular */}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          noValidate
          className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <h2 className="mb-6 text-lg font-semibold text-slate-700 dark:text-slate-200">
            Anmelden
          </h2>

          {/* Fehlermeldung */}
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Benutzername */}
            <div>
              <label
                htmlFor="username"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Benutzername
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                disabled={isPending}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="min-h-touch w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                placeholder="max.mustermann"
              />
            </div>

            {/* Passwort */}
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Passwort
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isPending}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-touch w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                placeholder="••••••••"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending || !username.trim() || !password}
              className="min-h-touch flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Spinner size="h-4 w-4" label="Wird angemeldet…" />
                  Anmelden…
                </>
              ) : (
                'Anmelden'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
