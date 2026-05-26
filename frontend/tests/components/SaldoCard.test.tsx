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

  it('zeigt Striche heute wenn übergeben', () => {
    render(<SaldoCard balanceCents={500} stricheHeute={3} />);
    expect(screen.getByText(/3 Striche heute/)).toBeDefined();
  });

  it('zeigt keine Striche-heute-Zeile wenn stricheHeute=0', () => {
    render(<SaldoCard balanceCents={500} stricheHeute={0} />);
    expect(screen.queryByText(/Striche heute/)).toBeNull();
  });
});
