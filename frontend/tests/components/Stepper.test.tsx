import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stepper from '../../src/components/Stepper';

describe('Stepper', () => {
  it('zeigt den Anfangswert', () => {
    render(<Stepper value={3} onChange={() => {}} />);
    expect(screen.getByText('3')).toBeDefined();
  });

  it('ruft onChange mit erhöhtem Wert auf', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stepper value={2} onChange={onChange} />);
    await user.click(screen.getByLabelText('Erhöhen'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('ruft onChange mit verringertem Wert auf', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stepper value={2} onChange={onChange} min={0} />);
    await user.click(screen.getByLabelText('Verringern'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('Minus-Button disabled wenn value === min', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stepper value={0} onChange={onChange} min={0} />);
    await user.click(screen.getByLabelText('Verringern'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Plus-Button disabled wenn value === max', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stepper value={10} onChange={onChange} max={10} />);
    await user.click(screen.getByLabelText('Erhöhen'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
