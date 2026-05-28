import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SaldoCard from '../../src/components/SaldoCard';

describe('SaldoCard', () => {
  it('rendert ohne Fehler', () => {
    render(<SaldoCard balanceCents={1440} />);
  });

  it('zeigt positiven Saldo (schuldet Geld)', () => {
    render(<SaldoCard balanceCents={1440} />);
    expect(screen.getByText(/14,40/)).toBeDefined();
    expect(screen.getByText('Schoppe weiter — oder tilg.')).toBeDefined();
  });

  it('zeigt bezahlt-Text bei balanceCents=0', () => {
    render(<SaldoCard balanceCents={0} />);
    expect(screen.getByText('Sauber. Du hängst nicht.')).toBeDefined();
  });

  it('zeigt Striche heute als TallyStrokes-Grafik wenn übergeben', () => {
    render(<SaldoCard balanceCents={500} stricheHeute={3} />);
    // SaldoCard rendert jetzt echte TallyStrokes-SVGs mit aria-label statt Plain-Text
    expect(screen.getByRole('img', { name: /3 Striche heute/ })).toBeDefined();
    // Die "heute"-Beschriftung daneben ist weiterhin sichtbar
    expect(screen.getByText('heute')).toBeDefined();
  });

  it('zeigt keine Striche-heute-Zeile wenn stricheHeute=0', () => {
    render(<SaldoCard balanceCents={500} stricheHeute={0} />);
    // Kein TallyStrokes-img und keine "heute"-Beschriftung
    expect(screen.queryByRole('img', { name: /Striche heute/ })).toBeNull();
    expect(screen.queryByText('heute')).toBeNull();
  });
});
