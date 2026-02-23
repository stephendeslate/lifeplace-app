import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/render';
import { KPICard } from './KPICard';

describe('KPICard', () => {
  it('renders title and value', () => {
    renderWithProviders(<KPICard title="Total Revenue" value="12500" />);
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('12500')).toBeInTheDocument();
  });

  it('shows skeleton elements when isLoading is true', () => {
    const { container } = renderWithProviders(
      <KPICard title="Revenue" value="100" isLoading={true} />,
    );
    // When loading, Skeleton components are rendered instead of real content
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
    // MUI Skeleton renders as span with MuiSkeleton class
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows trend up icon when trend is positive', () => {
    const { container } = renderWithProviders(<KPICard title="Events" value="42" trend={15} />);
    expect(screen.getByText('+15%')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="TrendingUpIcon"]')).toBeInTheDocument();
  });

  it('shows trend down icon when trend is negative', () => {
    const { container } = renderWithProviders(<KPICard title="Events" value="42" trend={-8} />);
    expect(screen.getByText('-8%')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="TrendingDownIcon"]')).toBeInTheDocument();
  });

  it('shows trend flat icon when trend is zero', () => {
    const { container } = renderWithProviders(<KPICard title="Events" value="42" trend={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="TrendingFlatIcon"]')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    renderWithProviders(<KPICard title="Revenue" value="5000" subtitle="vs last month" />);
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('does not render trend icons when trend is undefined', () => {
    const { container } = renderWithProviders(<KPICard title="Events" value="42" />);
    expect(container.querySelector('[data-testid="TrendingUpIcon"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="TrendingDownIcon"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="TrendingFlatIcon"]')).not.toBeInTheDocument();
  });

  it('renders numeric value correctly', () => {
    renderWithProviders(<KPICard title="Count" value={128} />);
    expect(screen.getByText('128')).toBeInTheDocument();
  });
});
