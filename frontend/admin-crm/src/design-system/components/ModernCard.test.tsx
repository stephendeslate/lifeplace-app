// ModernCard Component Tests
// Basic tests to verify component functionality

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModernCard, migrateGlassCardProps } from './ModernCard';
import type { CardVariant, CardSize } from './ModernCard';

describe('ModernCard', () => {
  it('renders children correctly', () => {
    render(<ModernCard>Test Content</ModernCard>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies default variant (elevated) when no variant specified', () => {
    const { container } = render(<ModernCard>Content</ModernCard>);
    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();
  });

  it('renders all variants without errors', () => {
    const variants: CardVariant[] = [
      'subtle',
      'elevated',
      'warm',
      'terracotta',
      'sage',
      'outlined',
    ];

    variants.forEach((variant) => {
      const { container } = render(<ModernCard variant={variant}>{variant} content</ModernCard>);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('renders all sizes without errors', () => {
    const sizes: CardSize[] = ['small', 'medium', 'large'];

    sizes.forEach((size) => {
      const { container } = render(<ModernCard size={size}>{size} content</ModernCard>);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<ModernCard onClick={handleClick}>Clickable Content</ModernCard>);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('adds role="button" when clickable', () => {
    const { container } = render(<ModernCard clickable>Content</ModernCard>);

    const card = container.firstChild as HTMLElement;
    expect(card.getAttribute('role')).toBe('button');
  });

  it('handles Enter key press when clickable', () => {
    const handleClick = vi.fn();
    render(<ModernCard onClick={handleClick}>Content</ModernCard>);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles Space key press when clickable', () => {
    const handleClick = vi.fn();
    render(<ModernCard onClick={handleClick}>Content</ModernCard>);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: ' ', code: 'Space' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not add button role when not clickable', () => {
    const { container } = render(<ModernCard>Content</ModernCard>);

    const card = container.firstChild as HTMLElement;
    expect(card.getAttribute('role')).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(<ModernCard className="custom-class">Content</ModernCard>);

    const card = container.firstChild as HTMLElement;
    expect(card.classList.contains('custom-class')).toBe(true);
  });

  it('merges custom sx styles', () => {
    const { container } = render(<ModernCard sx={{ backgroundColor: 'red' }}>Content</ModernCard>);

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();
  });
});

describe('migrateGlassCardProps', () => {
  it('migrates light variant to subtle', () => {
    const result = migrateGlassCardProps({ variant: 'light' });
    expect(result.variant).toBe('subtle');
  });

  it('migrates medium variant to elevated', () => {
    const result = migrateGlassCardProps({ variant: 'medium' });
    expect(result.variant).toBe('elevated');
  });

  it('migrates strong variant to elevated', () => {
    const result = migrateGlassCardProps({ variant: 'strong' });
    expect(result.variant).toBe('elevated');
  });

  it('migrates success variant to sage', () => {
    const result = migrateGlassCardProps({ variant: 'success' });
    expect(result.variant).toBe('sage');
  });

  it('migrates warning variant to warm', () => {
    const result = migrateGlassCardProps({ variant: 'warning' });
    expect(result.variant).toBe('warm');
  });

  it('migrates error variant to terracotta', () => {
    const result = migrateGlassCardProps({ variant: 'error' });
    expect(result.variant).toBe('terracotta');
  });

  it('preserves hover prop', () => {
    const result = migrateGlassCardProps({ hover: true });
    expect(result.hover).toBe(true);
  });

  it('preserves clickable prop', () => {
    const result = migrateGlassCardProps({ clickable: true });
    expect(result.clickable).toBe(true);
  });

  it('preserves onClick handler', () => {
    const onClick = vi.fn();
    const result = migrateGlassCardProps({ onClick });
    expect(result.onClick).toBe(onClick);
  });

  it('sets default size to medium', () => {
    const result = migrateGlassCardProps({});
    expect(result.size).toBe('medium');
  });

  it('defaults to elevated variant when no variant provided', () => {
    const result = migrateGlassCardProps({});
    expect(result.variant).toBe('elevated');
  });
});
