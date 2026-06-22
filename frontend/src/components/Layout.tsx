import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Beer, BookOpen, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { useToast } from '../contexts/ToastContext.js';
import ToastContainer from './Toast.js';
import WordmarkHeader from './WordmarkHeader.js';

// ---------------------------------------------------------------------------
// Nav-Icons (Lucide-Aliase für semantische Namen)
// ---------------------------------------------------------------------------
const IconStube = () => <Beer size={20} aria-hidden />;
const IconBuch = () => <BookOpen size={20} aria-hidden />;
const IconVerwaltung = () => <Settings size={20} aria-hidden />;

// ---------------------------------------------------------------------------
// Desktop-Nav-Stil
// ---------------------------------------------------------------------------

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? '' : '';
}

// ---------------------------------------------------------------------------
// Mobile-Tab-Stil
// ---------------------------------------------------------------------------

function tabStyle(isActive: boolean): React.CSSProperties {
  return {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: '8px 4px',
    fontSize: 11,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--tinte)' : 'var(--fg-3)',
    textDecoration: 'none',
    transition: 'color 0.15s',
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

  const initials = member?.display_name
    ? member.display_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <WordmarkHeader avatarInitials={initials} onAvatarClick={() => void navigate('/profil')} />

      {/* ------------------------------------------------------------------ */}
      {/* Desktop-Navigation                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg-card)',
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
          }}
        >
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NavLink
              to="/buchen"
              className={navClass}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                minHeight: 44,
                borderRadius: 'var(--r-2)',
                padding: '8px 12px',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 150ms',
                background: isActive ? 'var(--korps-rot)' : 'transparent',
                color: isActive ? 'var(--kreide)' : 'var(--fg-2)',
              })}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                if (!el.dataset['active']) el.style.background = 'var(--bg-2)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                if (!el.dataset['active']) el.style.background = 'transparent';
              }}
            >
              Buchen
            </NavLink>
            <NavLink
              to="/profil"
              className={navClass}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                minHeight: 44,
                borderRadius: 'var(--r-2)',
                padding: '8px 12px',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 150ms',
                background: isActive ? 'var(--korps-rot)' : 'transparent',
                color: isActive ? 'var(--kreide)' : 'var(--fg-2)',
              })}
            >
              Profil
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                className={navClass}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 44,
                  borderRadius: 'var(--r-2)',
                  padding: '8px 12px',
                  fontSize: 14,
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'background 150ms',
                  background: isActive ? 'var(--korps-rot)' : 'transparent',
                  color: isActive ? 'var(--kreide)' : 'var(--fg-2)',
                })}
              >
                Admin
              </NavLink>
            )}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'none',
                fontSize: 12,
                color: 'var(--fg-3)',
              }}
              className="sm:block"
            >
              {member?.display_name}
            </span>
            <button
              onClick={() => void handleLogout()}
              style={{
                minHeight: 44,
                borderRadius: 'var(--r-2)',
                padding: '8px 12px',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                color: 'var(--fg-3)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hauptinhalt                                                         */}
      {/* ------------------------------------------------------------------ */}
      <main
        style={{
          maxWidth: 960,
          margin: '0 auto',
          width: '100%',
          flex: 1,
          padding: '24px 16px',
        }}
      >
        <Outlet />
        {/* Platzhalter, damit das letzte Element nicht hinter der fixierten
            Mobile-TabBar verschwindet (nur < sm sichtbar). */}
        <div className="sm:hidden" style={{ height: 72 }} aria-hidden />
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
