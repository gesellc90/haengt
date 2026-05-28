import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Sigel from '../../src/components/Sigel';

describe('Sigel', () => {
  it('rendert ein SVG-Element', () => {
    const { container } = render(<Sigel />);
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('hat role="img" und zugänglichen aria-label', () => {
    const { container } = render(<Sigel />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toContain('Hängt!');
  });

  it('übernimmt ein benutzerdefiniertes label', () => {
    const { container } = render(<Sigel label="Wappen der Saxonia" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('Wappen der Saxonia');
  });

  it('rendert mit der übergebenen Größe', () => {
    const { container } = render(<Sigel size={120} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('120');
    expect(svg?.getAttribute('height')).toBe('120');
  });

  it('enthält die Tally-Striche (4 senkrechte + 1 Diagonale)', () => {
    const { container } = render(<Sigel />);
    // Im Sigel-Innenblock gibt es exakt 5 line-Elemente
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(5);
  });
});
