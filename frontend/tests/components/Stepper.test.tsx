import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stepper from '../../src/components/Stepper';

describe('Stepper', () => {
  it('rendert den Initialwert', () => {
    render(<Stepper value={3} onChange={() => {}} />);
    expect(screen.getByText('3')).toBeDefined();
  });

  it('Klick auf + ruft onChange mit value+1 auf', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stepper value={2} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Mehr' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('Klick auf − ruft onChange mit value-1 auf', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stepper value={5} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Weniger' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('− ist disabled bei value=min', () => {
    render(<Stepper value={0} onChange={() => {}} min={0} />);
    const minusBtn = screen.getByRole('button', { name: 'Weniger' });
    expect(minusBtn.hasAttribute('disabled')).toBe(true);
  });

  it('+ ist disabled bei value=max', () => {
    render(<Stepper value={99} onChange={() => {}} max={99} />);
    const plusBtn = screen.getByRole('button', { name: 'Mehr' });
    expect(plusBtn.hasAttribute('disabled')).toBe(true);
  });
});
