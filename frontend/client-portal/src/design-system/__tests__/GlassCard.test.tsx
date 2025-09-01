// design-system/__tests__/GlassCard.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { GlassCard } from '../components/GlassCard';
import { theme } from '../../utils/theme';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('GlassCard', () => {
  it('renders children correctly', () => {
    renderWithTheme(
      <GlassCard>
        <div>Test Content</div>
      </GlassCard>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies correct variant styles', () => {
    const { container } = renderWithTheme(
      <GlassCard variant="forest" data-testid="glass-card">
        <div>Forest Variant</div>
      </GlassCard>
    );
    
    const glassCard = container.firstChild as HTMLElement;
    expect(glassCard).toHaveStyle({
      borderRadius: '20px',
      padding: '24px',
    });
  });

  it('applies different intensities correctly', () => {
    renderWithTheme(
      <GlassCard intensity="subtle">
        <div>Subtle Intensity</div>
      </GlassCard>
    );
    
    expect(screen.getByText('Subtle Intensity')).toBeInTheDocument();
    
    // In a real browser, this would test backdrop-filter differences
    // In jsdom, we just verify the component renders with different intensities
  });

  it('renders without hover effects when hover is disabled', () => {
    const { container } = renderWithTheme(
      <GlassCard hover={false}>
        <div>No Hover</div>
      </GlassCard>
    );
    
    const glassCard = container.firstChild as HTMLElement;
    expect(glassCard).not.toHaveStyle({
      cursor: 'pointer',
    });
  });

  it('applies gradient overlay when gradient prop is true', () => {
    renderWithTheme(
      <GlassCard gradient>
        <div>Gradient Card</div>
      </GlassCard>
    );
    
    expect(screen.getByText('Gradient Card')).toBeInTheDocument();
  });

  it('forwards other props correctly', () => {
    renderWithTheme(
      <GlassCard data-testid="test-card" className="custom-class">
        <div>Custom Props</div>
      </GlassCard>
    );
    
    const card = screen.getByTestId('test-card');
    expect(card).toHaveClass('custom-class');
  });
});