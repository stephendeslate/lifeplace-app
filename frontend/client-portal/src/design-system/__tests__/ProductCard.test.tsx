// design-system/__tests__/ProductCard.test.tsx

import './test-setup';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { vi } from 'vitest';
import { ProductCard } from '../visualizations/PricingDisplay';
import { theme } from '../../utils/theme';
import type { ProductOption } from '../../types/booking/stepData.types';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ProductCard', () => {
  const mockProduct: ProductOption = {
    id: 1,
    name: 'Wedding Package',
    description: 'Complete wedding package with all essentials',
    product_type: 'PACKAGE',
    base_price: '25000.00',
    is_tax_inclusive: false,
    category: 1,
    category_name: 'Wedding Services',
    is_active: true,
    is_featured: true,
    has_excess_hours: true,
    included_hours: 8,
    excess_hour_price: '2500.00',
    pricing_model: 'FLAT',
    advance_booking_days: 30,
    maximum_booking_days: 365,
    minimum_quantity: 1,
    maximum_quantity: 1,
    sort_order: 1,
    sku: 'WED-PKG-001',
    tags: ['wedding', 'premium'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('renders product information correctly', () => {
    renderWithTheme(
      <ProductCard product={mockProduct} />
    );
    
    expect(screen.getByText('Wedding Package')).toBeInTheDocument();
    expect(screen.getByText('Complete wedding package with all essentials')).toBeInTheDocument();
    expect(screen.getByText('PACKAGE')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('₱25,000')).toBeInTheDocument();
  });

  it('shows included hours when available', () => {
    renderWithTheme(
      <ProductCard product={mockProduct} showDetails={true} />
    );
    
    expect(screen.getByText('Includes 8 hours')).toBeInTheDocument();
  });

  it('shows excess hour pricing when available', () => {
    renderWithTheme(
      <ProductCard product={mockProduct} showDetails={true} />
    );
    
    expect(screen.getByText('Additional hours: ₱2,500/hour')).toBeInTheDocument();
  });

  it('shows advance booking requirements', () => {
    renderWithTheme(
      <ProductCard product={mockProduct} showDetails={true} />
    );
    
    expect(screen.getByText('Book at least 30 days in advance')).toBeInTheDocument();
  });

  it('handles inactive products correctly', () => {
    const inactiveProduct = { ...mockProduct, is_active: false };
    
    renderWithTheme(
      <ProductCard product={inactiveProduct} />
    );
    
    expect(screen.getByText('Currently unavailable')).toBeInTheDocument();
    
    // Should have reduced opacity
    const card = screen.getByText('Wedding Package').closest('div');
    expect(card).toHaveStyle({ opacity: '0.6' });
  });

  it('calls onSelect when clicked', () => {
    const mockOnSelect = vi.fn();
    
    renderWithTheme(
      <ProductCard 
        product={mockProduct} 
        onSelect={mockOnSelect}
      />
    );
    
    const card = screen.getByText('Wedding Package');
    fireEvent.click(card);
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockProduct);
  });

  it('applies selected styling when selected', () => {
    renderWithTheme(
      <ProductCard 
        product={mockProduct} 
        selected={true}
      />
    );
    
    // Selected card should have forest gradient background
    const card = screen.getByText('Wedding Package').closest('div');
    expect(card).toHaveStyle({ color: 'rgb(255, 255, 255)' });
  });

  it('handles products without featured status', () => {
    const regularProduct = { ...mockProduct, is_featured: false };
    
    renderWithTheme(
      <ProductCard product={regularProduct} />
    );
    
    expect(screen.queryByText('Featured')).not.toBeInTheDocument();
    expect(screen.getByText('Wedding Package')).toBeInTheDocument();
  });

  it('handles products without excess hours', () => {
    const noExcessProduct = { 
      ...mockProduct, 
      has_excess_hours: false,
      excess_hour_price: undefined,
      included_hours: undefined,
    };
    
    renderWithTheme(
      <ProductCard product={noExcessProduct} showDetails={true} />
    );
    
    expect(screen.queryByText(/Includes.*hours/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Additional hours/)).not.toBeInTheDocument();
  });

  it('shows PRODUCT type correctly', () => {
    const productItem = { ...mockProduct, product_type: 'PRODUCT' as const };
    
    renderWithTheme(
      <ProductCard product={productItem} />
    );
    
    expect(screen.getByText('PRODUCT')).toBeInTheDocument();
  });

  it('handles hourly pricing model', () => {
    const hourlyProduct = { 
      ...mockProduct, 
      pricing_model: 'HOURLY' as const 
    };
    
    renderWithTheme(
      <ProductCard product={hourlyProduct} />
    );
    
    expect(screen.getByText('per hour')).toBeInTheDocument();
  });

  it('hides details when showDetails is false', () => {
    renderWithTheme(
      <ProductCard 
        product={mockProduct} 
        showDetails={false}
      />
    );
    
    expect(screen.queryByText('Complete wedding package with all essentials')).not.toBeInTheDocument();
    expect(screen.queryByText('Includes 8 hours')).not.toBeInTheDocument();
  });
});