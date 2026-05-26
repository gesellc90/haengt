import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StrichRow from '../../src/components/StrichRow';

describe('StrichRow', () => {
  it('zeigt den Anzeigenamen', () => {
    render(
      <StrichRow
        displayName="Anna Muster"
        role="aktiver"
        tallyCount={3}
        balanceCents={450}
        isPaid={false}
      />,
    );
    expect(screen.getByText('Anna Muster')).toBeDefined();
  });

  it('zeigt den formatierten Saldo', () => {
    render(
      <StrichRow
        displayName="Bernd Beispiel"
        role="senior"
        tallyCount={0}
        balanceCents={150}
        isPaid={false}
      />,
    );
    expect(screen.getByText('1,50 €')).toBeDefined();
  });

  it('zeigt Initialen im Avatar', () => {
    render(
      <StrichRow
        displayName="Anna Muster"
        role="fux"
        tallyCount={1}
        balanceCents={100}
        isPaid={true}
      />,
    );
    expect(screen.getByText('AM')).toBeDefined();
  });
});
