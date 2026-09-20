import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Trend } from '../components/evolution/charts/Trend';
import { BarChart } from '../components/evolution/charts/BarChart';
import { ProportionBar } from '../components/evolution/charts/ProportionBar';
import { RangeBar } from '../components/evolution/charts/RangeBar';
import { CategorySection, CategoryFilterBar } from '../components/evolution/charts/CategorySection';

describe('Trend', () => {
  it('renders nothing for an empty series', () => {
    const { container } = render(<Trend points={[]} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('draws a baseline reference line when a baseline value is given', () => {
    const { container } = render(<Trend points={[{ label: 'a', value: 10 }, { label: 'b', value: 20 }]} baseline={15} />);
    expect(container.querySelector('line')).toBeInTheDocument();
    expect(screen.getByText('Tu típico')).toBeInTheDocument();
  });
});

describe('BarChart', () => {
  it('renders one bar per group and treats a zero value as a flat sliver, not a missing bar', () => {
    const { container } = render(
      <BarChart groups={[{ label: 'M1', bars: [{ value: 10, color: 'red' }] }, { label: 'M2', bars: [{ value: 0, color: 'red' }] }]} />
    );
    expect(container.querySelectorAll('rect').length).toBe(2);
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
