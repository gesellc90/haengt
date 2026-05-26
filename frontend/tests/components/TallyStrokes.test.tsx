import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TallyStrokes from '../../src/components/TallyStrokes';

describe('TallyStrokes', () => {
  it('zeigt Gedankenstrich bei count=0', () => {
    render(<TallyStrokes count={0} />);
    expect(screen.getByText('—')).toBeDefined();
  });

  it('zeigt ein SVG-Element bei count=3', () => {
    const { container } = render(<TallyStrokes count={3} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(1);
  });

  it('zeigt zwei Gruppen bei count=7 (5+2)', () => {
    const { container } = render(<TallyStrokes count={7} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });

  it('hat role="img" mit aria-label', () => {
    render(<TallyStrokes count={5} label="5 Striche heute" />);
    expect(screen.getByRole('img', { name: '5 Striche heute' })).toBeDefined();
  });

  it('verwendet Standard-aria-label wenn kein label prop', () => {
    render(<TallyStrokes count={3} />);
    expect(screen.getByRole('img', { name: '3 Striche' })).toBeDefined();
  });
});
