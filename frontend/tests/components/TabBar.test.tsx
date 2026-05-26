import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TabBar from '../../src/components/TabBar';

describe('TabBar', () => {
  it('rendert alle 4 Tabs', () => {
    render(<TabBar active="stube" onChange={() => {}} />);
    expect(screen.getByLabelText('Stube')).toBeDefined();
    expect(screen.getByLabelText('Strich')).toBeDefined();
    expect(screen.getByLabelText('Liste')).toBeDefined();
    expect(screen.getByLabelText('Buch')).toBeDefined();
  });

  it('aktiver Tab hat aria-current="page"', () => {
    render(<TabBar active="strich" onChange={() => {}} />);
    expect(screen.getByLabelText('Strich').getAttribute('aria-current')).toBe('page');
    expect(screen.getByLabelText('Stube').getAttribute('aria-current')).toBeNull();
  });

  it('ruft onChange auf wenn ein Tab geklickt wird', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TabBar active="stube" onChange={onChange} />);
    await user.click(screen.getByLabelText('Liste'));
    expect(onChange).toHaveBeenCalledWith('liste');
  });
});
