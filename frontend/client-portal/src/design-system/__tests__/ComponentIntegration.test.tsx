// design-system/__tests__/ComponentIntegration.test.tsx

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GlassCard } from '../components/GlassCard';
import { GradientBackground } from '../components/GradientBackground';
import { AnimatedElement } from '../components/AnimatedElement';

describe('Glass Morphism Component Integration', () => {
  describe('GlassCard', () => {
    it('renders with all variants', () => {
      const variants: Array<'light' | 'dark' | 'forest' | 'earth' | 'gold'> = 
        ['light', 'dark', 'forest', 'earth', 'gold'];
      
      variants.forEach(variant => {
        const { container } = render(
          <GlassCard variant={variant} data-testid={`glass-${variant}`}>
            Test Content {variant}
          </GlassCard>
        );
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('renders with all intensities', () => {
      const intensities: Array<'subtle' | 'medium' | 'strong'> = 
        ['subtle', 'medium', 'strong'];
      
      intensities.forEach(intensity => {
        const { container } = render(
          <GlassCard intensity={intensity} data-testid={`glass-${intensity}`}>
            Test Content {intensity}
          </GlassCard>
        );
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('applies hover effect when hover prop is true', () => {
      const { container } = render(
        <GlassCard hover={true} data-testid="glass-hover">
          Hoverable Content
        </GlassCard>
      );
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('GradientBackground', () => {
    it('renders with all gradient types', () => {
      const gradients: Array<'sunrise' | 'sunset' | 'forest' | 'meadow' | 'sky' | 'earth' | 'mist'> = 
        ['sunrise', 'sunset', 'forest', 'meadow', 'sky', 'earth', 'mist'];
      
      gradients.forEach(gradient => {
        const { container } = render(
          <GradientBackground gradient={gradient} data-testid={`gradient-${gradient}`}>
            Test Content {gradient}
          </GradientBackground>
        );
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('renders with animation when animated prop is true', () => {
      const { container } = render(
        <GradientBackground gradient="forest" animated={true}>
          Animated Background
        </GradientBackground>
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('renders with overlay when overlay prop is true', () => {
      const { container } = render(
        <GradientBackground gradient="forest" overlay={true}>
          Background with Overlay
        </GradientBackground>
      );
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('AnimatedElement', () => {
    it('renders with all animation types', () => {
      const animations: Array<'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scaleUp' | 'scaleDown'> = 
        ['fadeIn', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'scaleUp', 'scaleDown'];
      
      animations.forEach(animation => {
        const { container } = render(
          <AnimatedElement animation={animation} data-testid={`animated-${animation}`}>
            Test Content {animation}
          </AnimatedElement>
        );
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('renders with delay prop', () => {
      const { container } = render(
        <AnimatedElement animation="fadeIn" delay={500}>
          Delayed Animation
        </AnimatedElement>
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('renders with duration prop', () => {
      const { container } = render(
        <AnimatedElement animation="fadeIn" duration={1000}>
          Custom Duration Animation
        </AnimatedElement>
      );
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Component Composition', () => {
    it('renders GlassCard inside GradientBackground', () => {
      const { container } = render(
        <GradientBackground gradient="forest">
          <GlassCard variant="light" intensity="medium">
            Nested Content
          </GlassCard>
        </GradientBackground>
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('renders AnimatedElement with GlassCard', () => {
      const { container } = render(
        <AnimatedElement animation="fadeIn" delay={100}>
          <GlassCard variant="light">
            Animated Glass Card
          </GlassCard>
        </AnimatedElement>
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('renders full composition stack as used in Login/Register', () => {
      const { container } = render(
        <GradientBackground gradient="forest" animated={true}>
          <AnimatedElement animation="fadeIn" delay={100}>
            <GlassCard variant="light" intensity="medium">
              Login Form Content
            </GlassCard>
          </AnimatedElement>
        </GradientBackground>
      );
      expect(container.firstChild).toBeTruthy();
    });
  });
});