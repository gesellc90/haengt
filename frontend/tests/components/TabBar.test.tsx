import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TabBar from '../../src/components/TabBar';

describe('TabBar', () => {
  it('rendert ohne Fehler', () => {
    render(<TabBar active="stube" onChange={() => {}} />);
  });

  it('zeigt alle vier Tab-Labels', () => {
    render(<TabBar active="stube" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Stube' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Strich' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Liste' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Buch' })).toBeDefined();
  });

  it('aktiver Tab hat aria-current="page"', () => {
    render(<TabBar active="strich" onChange={() => {}} />);
    const activeBtn = screen.getByRole('button', { name: 'Strich' });
    expect(activeBtn.getAttribute('aria-current')).toBe('page');
  });

  it('onChange wird beim Klick aufgerufen', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TabBar active="stube" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Liste' }));
    expect(onChange).toHaveBeenCalledWith('liste');
  });
});
