import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { useToast } from '../contexts/ToastContext.js';
import ToastContainer from './Toast.js';

// ---------------------------------------------------------------------------
// NavLink-Hilfsfunktion
// ---------------------------------------------------------------------------

function navClass({ isActive }: { isActive: boolean }) {
  return [
    'min-h-touch flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700',
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Layout-Komponente
// ---------------------------------------------------------------------------

export default function Layout() {
  const { member, isAdmin, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      showToast('Abmelden fehlgeschlagen. Bitte erneut versuchen.', 'error');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      {/* ------------------------------------------------------------------ */}
      {/* Header / Navigation                                                */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2">
          <span className="text-lg font-bold text-slate-800 dark:text-white">🍺 Hängt!</span>

          <nav className="flex items-center gap-1">
            <NavLink to="/buchen" className={navClass}>
              Buchen
            </NavLink>
            <NavLink to="/profil" className={navClass}>
              Profil
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navClass}>
                Admin
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
              {member?.display_name}
            </span>
            <button
              onClick={() => void handleLogout()}
              className="min-h-touch rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hauptinhalt                                                         */}
      {/* ------------------------------------------------------------------ */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Toasts                                                              */}
      {/* ------------------------------------------------------------------ */}
      <ToastContainer />
    </div>
  );
}
