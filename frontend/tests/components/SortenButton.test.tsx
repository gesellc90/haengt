import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SortenButton from '../../src/components/SortenButton';

describe('SortenButton', () => {
  it('rendert Name und Preis', () => {
    render(<SortenButton name="Pils 0,4 l" priceCents={180} onClick={() => {}} />);
    expect(screen.getByText('Pils 0,4 l')).toBeDefined();
    expect(screen.getByText('1,80 €')).toBeDefined();
  });

  it('onClick wird aufgerufen', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<SortenButton name="Helles" priceCents={220} onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('onClick wird nicht aufgerufen wenn disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<SortenButton name="Helles" priceCents={220} onClick={handleClick} disabled />);
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('zeigt Spinner wenn isLoading, kein Name sichtbar', () => {
    render(<SortenButton name="Pils" priceCents={180} onClick={() => {}} isLoading />);
    expect(screen.queryByText('Pils')).toBeNull();
    // Spinner hat role="status"
    expect(screen.getByRole('status')).toBeDefined();
  });
});
