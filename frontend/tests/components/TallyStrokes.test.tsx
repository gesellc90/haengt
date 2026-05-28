import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TallyStrokes from '../../src/components/TallyStrokes';

describe('TallyStrokes', () => {
  it('rendert einen Bindestrich bei count <= 0', () => {
    const { container } = render(<TallyStrokes count={0} />);
    expect(container.textContent).toBe('—');
  });

  it('rendert ein vollständiges SVG bei count=5 (4 Linien + Diagonale)', () => {
    const { container } = render(<TallyStrokes count={5} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(1);
    const lines = svgs[0]!.querySelectorAll('line');
    // 4 senkrechte + 1 diagonale = 5
    expect(lines.length).toBe(5);
  });

  it('rendert zwei SVG-Gruppen bei count=7 (5 + 2)', () => {
    const { container } = render(<TallyStrokes count={7} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });

  it('aria-label enthält die Anzahl der Striche', () => {
    render(<TallyStrokes count={13} />);
    expect(screen.getByRole('img', { name: /13 Striche/ })).toBeDefined();
  });

  it('übernimmt ein benutzerdefiniertes label', () => {
    render(<TallyStrokes count={3} label="drei Bier" />);
    expect(screen.getByRole('img', { name: 'drei Bier' })).toBeDefined();
  });
});
