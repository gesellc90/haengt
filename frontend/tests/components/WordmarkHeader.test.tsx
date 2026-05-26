import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WordmarkHeader from '../../src/components/WordmarkHeader';

describe('WordmarkHeader', () => {
  it('rendert den Wordmark "Hängt!"', () => {
    render(<WordmarkHeader />);
    expect(screen.getByText(/Hängt/)).toBeDefined();
  });

  it('zeigt Initialen im Avatar-Button', () => {
    render(<WordmarkHeader avatarInitials="AB" />);
    expect(screen.getByText('AB')).toBeDefined();
  });

  it('ruft onAvatarClick auf wenn geklickt', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<WordmarkHeader avatarInitials="CG" onAvatarClick={onClick} />);
    await user.click(screen.getByRole('button', { name: 'Profil' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('kein Avatar-Button ohne avatarInitials', () => {
    render(<WordmarkHeader />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
