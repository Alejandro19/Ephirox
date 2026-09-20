import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Trend } from '../components/evolution/charts/Trend';
import { BarChart } from '../components/evolution/charts/BarChart';
import { ProportionBar } from '../components/evolution/charts/ProportionBar';
import { RangeBar } from '../components/evolution/charts/RangeBar';
import { CategorySection, CategoryFilterBar } from '../components/evolution/charts/CategorySection';

describe('Trend', () => {
  // spec 30.2 — menos de 2 puntos no alcanza para una tendencia real: se
  // reserva la altura fija de la gráfica y se dibuja un estado vacío
  // explícito, nunca un área completamente en blanco.
  it('shows a fixed-height empty state instead of blank space for an empty series', () => {
    const { container } = render(<Trend points={[]} height={150} emptyMessage="Sin datos suficientes aún" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('height', '150');
    expect(screen.getByText('Sin datos suficientes aún')).toBeInTheDocument();
  });

  it('shows the same empty state for a single-point series instead of an oversized duplicated value', () => {
    render(<Trend points={[{ label: 'a', value: 42 }]} emptyMessage="Sin historial" />);
    expect(screen.getByText('Sin historial')).toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  // spec 30.1 — ancho fluido, alto fijo: nunca height:100%/auto heredado.
  it('fixes the svg height and stretches the viewBox to fill the container (no aspect-ratio letterboxing)', () => {
    const { container } = render(<Trend points={[{ label: 'a', value: 10 }, { label: 'b', value: 20 }]} height={180} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('height', '180');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
  });

  it('draws a baseline reference line when a baseline value is given', () => {
    const { container } = render(<Trend points={[{ label: 'a', value: 10 }, { label: 'b', value: 20 }]} baseline={15} />);
    expect(container.querySelector('line')).toBeInTheDocument();
    expect(screen.getByText('Tu típico')).toBeInTheDocument();
  });

  // spec 30.4 — si "Tu típico" cae cerca del punto final, se desplaza al
  // lado opuesto de la línea punteada en vez de solaparse con el valor final.
  it('flips the baseline label below its line when the final value sits right above it (would otherwise overlap)', () => {
    // Último punto (79) queda casi en la misma altura que el baseline (78):
    // por defecto la etiqueta "Tu típico" se dibuja arriba de su línea, que
    // caería encima de la etiqueta del valor final — debe desplazarse abajo.
    const points = [
      { label: 'a', value: 10 }, { label: 'b', value: 10 }, { label: 'c', value: 10 }, { label: 'd', value: 79 },
    ];
    const { container } = render(<Trend points={points} baseline={78} height={150} />);
    const baselineText = screen.getByText('Tu típico');
    const baselineLabelY = Number(baselineText.getAttribute('y'));
    const lineY = Number(container.querySelector('line')?.getAttribute('y1'));
    // Por defecto la etiqueta va en lineY - 4 (arriba); si se desplazó abajo,
    // su y queda por encima del valor numérico de la línea misma.
    expect(baselineLabelY).toBeGreaterThan(lineY);
  });
});

describe('BarChart', () => {
  it('renders one bar per group and treats a zero value as a flat sliver, not a missing bar', () => {
    const { container } = render(
      <BarChart groups={[{ label: 'M1', bars: [{ value: 10, color: 'red' }] }, { label: 'M2', bars: [{ value: 0, color: 'red' }] }]} />
    );
    expect(container.querySelectorAll('rect').length).toBe(2);
  });

  it('fixes the svg height and stretches the viewBox to fill the container', () => {
    const { container } = render(
      <BarChart groups={[{ label: 'M1', bars: [{ value: 10, color: 'red' }] }]} height={160} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('height', '160');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
  });
});

describe('ProportionBar', () => {
  it('renders one segment per item', () => {
    const { container } = render(
      <ProportionBar segments={[{ label: 'A', value: 3, color: 'red' }, { label: 'B', value: 1, color: 'blue' }]} />
    );
    expect(container.querySelectorAll('div > div').length).toBeGreaterThanOrEqual(2);
  });
});

describe('RangeBar', () => {
  it('shows the marker and the current value', () => {
    render(
      <RangeBar
        name="Glucosa" value={85} unit=" mg/dL"
        zones={[{ min: 0, max: 70, color: 'red', label: 'Bajo' }, { min: 70, max: 100, color: 'green', label: 'Normal' }]}
        domainMin={0} domainMax={100}
      />
    );
    expect(screen.getByText('Glucosa')).toBeInTheDocument();
    expect(screen.getByText(/85 mg\/dL/)).toBeInTheDocument();
  });
});

describe('CategorySection / CategoryFilterBar', () => {
  const cats = [
    { key: 'todas', label: 'Todas', color: 'gray' },
    { key: 'a', label: 'A', color: 'red' },
    { key: 'b', label: 'B', color: 'blue' },
  ];

  it('unmounts a section entirely (not just visually) when a different category is active', () => {
    const { rerender } = render(
      <CategorySection catKey="a" active="todas" color="red" label="A">
        <p>Contenido A</p>
      </CategorySection>
    );
    expect(screen.getByText('Contenido A')).toBeInTheDocument();

    rerender(
      <CategorySection catKey="a" active="b" color="red" label="A">
        <p>Contenido A</p>
      </CategorySection>
    );
    expect(screen.queryByText('Contenido A')).not.toBeInTheDocument();
  });

  it('calls onChange with the clicked category key', () => {
    const onChange = vi.fn();
    render(<CategoryFilterBar cats={cats} active="todas" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(onChange).toHaveBeenCalledWith('a');
  });
});
