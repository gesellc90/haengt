import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { useToast } from '../contexts/ToastContext.js';
import ToastContainer from './Toast.js';
import WordmarkHeader from './WordmarkHeader.js';

// ---------------------------------------------------------------------------
// Desktop-Nav-Stil
// ---------------------------------------------------------------------------

function navStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    minHeight: 44,
    padding: '6px 14px',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textDecoration: 'none',
    borderBottom: isActive ? '2px solid var(--korps-rot)' : '2px solid transparent',
    color: isActive ? 'var(--korps-rot)' : 'var(--tinte-3)',
    transition: 'color 120ms, border-color 120ms',
  };
}

// ---------------------------------------------------------------------------
// Bottom-TabBar Icons (inline SVG, kein externer Import)
// ---------------------------------------------------------------------------

function IconStube() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 3h18v4a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V3Z" />
      <path d="M8 11v8" />
      <path d="M16 11v8" />
      <path d="M5 19h14" />
    </svg>
  );
}
function IconBuch() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function IconVerwaltung() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
      <circle cx="19" cy="19" r="3" />
      <path d="M19 17v2M19 21v.01" />
    </svg>
  );
}

function tabStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: 1,
    minHeight: 56,
    padding: '6px 4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: isActive ? 'var(--korps-rot)' : 'var(--tinte-4)',
    fontFamily: 'var(--font-sans)',
    fontSize: 10,
    fontWeight: isActive ? 700 : 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
    transition: 'color 120ms',
  };
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

  const avatarInitials = member?.display_name
    ? member.display_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : undefined;

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* WordmarkHeader                                                       */}
      {/* ------------------------------------------------------------------ */}
      <WordmarkHeader avatarInitials={avatarInitials} onAvatarClick={() => navigate('/profil')} />

      {/* ------------------------------------------------------------------ */}
      {/* Navigation                                                           */}
      {/* ------------------------------------------------------------------ */}
      {/* ------------------------------------------------------------------ */}
      {/* Desktop-Nav (ab sm sichtbar)                                        */}
      {/* ------------------------------------------------------------------ */}
      <nav
        className="hidden sm:flex"
        aria-label="Hauptnavigation"
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--line)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
        }}
      >
        <NavLink to="/buchen" style={({ isActive }) => navStyle(isActive)}>
          Stube
        </NavLink>
        <NavLink to="/profil" style={({ isActive }) => navStyle(isActive)}>
          Mein Buch
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" style={({ isActive }) => navStyle(isActive)}>
            Verwaltung
          </NavLink>
        )}

        <div style={{ flex: 1 }} />

        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--tinte-3)',
            fontFamily: 'var(--font-sans)',
            whiteSpace: 'nowrap',
            paddingRight: 8,
          }}
        >
          {member?.display_name}
        </span>
        <button
          onClick={() => void handleLogout()}
          style={{
            display: 'flex',
            alignItems: 'center',
            minHeight: 44,
            padding: '6px 12px',
            background: 'transparent',
            border: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--tinte-4)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            borderBottom: '2px solid transparent',
            letterSpacing: '0.02em',
          }}
        >
          Abmelden
        </button>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Hauptinhalt                                                         */}
      {/* ------------------------------------------------------------------ */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 768,
          margin: '0 auto',
          padding: '20px 16px 88px', // 88px Puffer für Bottom-TabBar auf Mobile
          boxSizing: 'border-box',
        }}
      >
        <Outlet />
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom-TabBar (Mobile, bis sm)                                      */}
      {/* ------------------------------------------------------------------ */}
      <nav
        aria-label="Navigation"
        className="sm:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--line)',
          zIndex: 50,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <NavLink to="/buchen" style={({ isActive }) => tabStyle(isActive)}>
          <IconStube />
          Stube
        </NavLink>
        <NavLink to="/profil" style={({ isActive }) => tabStyle(isActive)}>
          <IconBuch />
          Mein Buch
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" style={({ isActive }) => tabStyle(isActive)}>
            <IconVerwaltung />
            Verwaltung
          </NavLink>
        )}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Toasts                                                              */}
      {/* ------------------------------------------------------------------ */}
      <ToastContainer />
    </div>
  );
}
