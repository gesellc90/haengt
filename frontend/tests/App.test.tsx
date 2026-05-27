import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

// ---------------------------------------------------------------------------
// Mocks: API-Calls simulieren (kein echter Netzwerk-Request)
// ---------------------------------------------------------------------------

vi.mock('../src/api/auth', () => ({
  authApi: {
    // Kein gültiges Token → Weiterleitung auf /login
    me: vi.fn().mockRejectedValue(new Error('no token')),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('App — Routing-Grundverhalten', () => {
  it('leitet nicht-eingeloggte User auf /login weiter', async () => {
    render(
      <MemoryRouter initialEntries={['/buchen']}>
        <App />
      </MemoryRouter>,
    );

    // Login-Seite zeigt den App-Titel und das Einloggen-Heading
    const appTitle = await screen.findByRole('heading', { name: /Hängt\s*!/i });
    expect(appTitle).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Einloggen/i })).toBeInTheDocument();
  });

  it('zeigt die Login-Seite direkt auf /login', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );

    const loginHeading = await screen.findByRole('heading', { name: /Einloggen/i });
    expect(loginHeading).toBeInTheDocument();
  });
});
