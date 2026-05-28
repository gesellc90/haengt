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

  it('zeigt Striche diesen Monat als TallyStrokes-Grafik wenn übergeben', () => {
    render(<SaldoCard balanceCents={500} stricheMonat={3} />);
    // SaldoCard rendert jetzt echte TallyStrokes-SVGs mit aria-label statt Plain-Text
    expect(screen.getByRole('img', { name: /3 Striche diesen Monat/ })).toBeDefined();
    // Die "diesen Monat"-Beschriftung daneben ist weiterhin sichtbar
    expect(screen.getByText('diesen Monat')).toBeDefined();
  });

  it('zeigt keine Striche-Monat-Zeile wenn stricheMonat=0', () => {
    render(<SaldoCard balanceCents={500} stricheMonat={0} />);
    // Kein TallyStrokes-img und keine "diesen Monat"-Beschriftung
    expect(screen.queryByRole('img', { name: /Striche diesen Monat/ })).toBeNull();
    expect(screen.queryByText('diesen Monat')).toBeNull();
  });
});
