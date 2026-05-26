import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StrichRow from '../../src/components/StrichRow';

describe('StrichRow', () => {
  const defaultProps = {
    displayName: 'Carl v. König',
    role: 'Aktiver' as const,
    strikeCount: 5,
    balanceCents: 900,
  };

  it('rendert ohne Fehler', () => {
    render(<StrichRow {...defaultProps} />);
  });

  it('zeigt den Anzeigenamen', () => {
    render(<StrichRow {...defaultProps} />);
    expect(screen.getByText('Carl v. König')).toBeDefined();
  });

  it('zeigt die Rolle', () => {
    render(<StrichRow {...defaultProps} />);
    expect(screen.getByText('Aktiver')).toBeDefined();
  });

  it('zeigt — bei balanceCents=0', () => {
    render(<StrichRow {...defaultProps} balanceCents={0} />);
    expect(screen.getByText('—')).toBeDefined();
  });

  it('onClick wird aufgerufen', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container } = render(<StrichRow {...defaultProps} onClick={onClick} />);
    await user.click(container.firstChild as HTMLElement);
    expect(onClick).toHaveBeenCalled();
  });
});
