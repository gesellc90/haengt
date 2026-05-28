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

  describe('animateLatest', () => {
    it('ohne animateLatest hat kein line-Element die Klasse strich-latest', () => {
      const { container } = render(<TallyStrokes count={5} />);
      expect(container.querySelectorAll('.strich-latest').length).toBe(0);
    });

    it('mit animateLatest=true hat genau eine line die Klasse strich-latest', () => {
      const { container } = render(<TallyStrokes count={5} animateLatest />);
      expect(container.querySelectorAll('.strich-latest').length).toBe(1);
    });

    it('animateLatest trifft bei 5er-Gruppe die Diagonale (letzte line)', () => {
      const { container } = render(<TallyStrokes count={5} animateLatest />);
      const animatedLines = container.querySelectorAll('.strich-latest');
      expect(animatedLines.length).toBe(1);
      // Die Diagonale geht von (1,20) nach (22,6)
      const line = animatedLines[0] as SVGLineElement;
      expect(line.getAttribute('x1')).toBe('1');
      expect(line.getAttribute('y1')).toBe('20');
    });

    it('animateLatest trifft bei Teilgruppe den letzten senkrechten Strich', () => {
      const { container } = render(<TallyStrokes count={3} animateLatest />);
      const animatedLines = container.querySelectorAll('.strich-latest');
      expect(animatedLines.length).toBe(1);
      // 3. senkrechter Strich: x = 3 + (3-1)*5 = 13
      const line = animatedLines[0] as SVGLineElement;
      expect(line.getAttribute('x1')).toBe('13');
    });

    it('animateLatest=true bei count=7 (5+2): nur letzter Strich der zweiten Gruppe', () => {
      const { container } = render(<TallyStrokes count={7} animateLatest />);
      expect(container.querySelectorAll('.strich-latest').length).toBe(1);
    });

    it('animateLatest=false ändert nichts am Rendering', () => {
      const { container: withFalse } = render(<TallyStrokes count={5} animateLatest={false} />);
      const { container: withTrue } = render(<TallyStrokes count={5} animateLatest />);
      // SVG-Struktur gleich, nur Klasse unterscheidet sich
      expect(withFalse.querySelectorAll('line').length).toBe(
        withTrue.querySelectorAll('line').length,
      );
    });
  });
});
