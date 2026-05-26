import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WordmarkHeader from '../../src/components/WordmarkHeader';

describe('WordmarkHeader', () => {
  it('rendert „Hängt!" im Header', () => {
    const { container } = render(<WordmarkHeader />);
    expect(container.textContent).toContain('Hängt');
    expect(container.textContent).toContain('!');
  });

  it('Avatar-Button zeigt übergebene Initialen', () => {
    render(<WordmarkHeader avatarInitials="CK" />);
    expect(screen.getByRole('button', { name: 'Profil öffnen' }).textContent).toBe('CK');
  });

  it('onAvatarClick wird aufgerufen', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<WordmarkHeader avatarInitials="CK" onAvatarClick={handleClick} />);
    await user.click(screen.getByRole('button', { name: 'Profil öffnen' }));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('kein Avatar-Button ohne avatarInitials', () => {
    render(<WordmarkHeader />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
