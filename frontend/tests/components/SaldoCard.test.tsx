import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SaldoCard from '../../src/components/SaldoCard';

describe('SaldoCard', () => {
  it('zeigt den formatierten Betrag', () => {
    render(<SaldoCard balanceCents={350} isPaid={false} />);
    expect(screen.getByText('3,50 €')).toBeDefined();
  });

  it('zeigt "Konto ausgeglichen" wenn isPaid=true', () => {
    render(<SaldoCard balanceCents={0} isPaid={true} />);
    expect(screen.getByText('Konto ausgeglichen')).toBeDefined();
  });

  it('zeigt "Offener Saldo" wenn isPaid=false', () => {
    render(<SaldoCard balanceCents={500} isPaid={false} />);
    expect(screen.getByText('Offener Saldo')).toBeDefined();
  });

  it('zeigt Strich-Zähler wenn todayCount > 0', () => {
    render(<SaldoCard balanceCents={100} isPaid={false} todayCount={3} />);
    expect(screen.getByText(/3 Striche heute/)).toBeDefined();
  });

  it('zeigt keinen Strich-Zähler wenn todayCount=0', () => {
    render(<SaldoCard balanceCents={100} isPaid={false} todayCount={0} />);
    expect(screen.queryByText(/Striche/)).toBeNull();
  });
});
