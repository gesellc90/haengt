import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.tsx';

describe('App', () => {
  it('rendert die Startseite mit Titel und Begrüßung', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /Hängt!/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /Willkommen/ }),
    ).toBeInTheDocument();
  });

  it('zeigt eine 404-Ansicht für unbekannte Routen', () => {
    render(
      <MemoryRouter initialEntries={['/gibt-es-nicht']}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: /nicht gefunden/i }),
    ).toBeInTheDocument();
  });
});
