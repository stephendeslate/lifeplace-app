// design-system/index.ts

// Tokens
export * from './tokens';

// Components
export { GlassCard } from './components/GlassCard';
export { GradientBackground } from './components/GradientBackground';
export { HeroBackground } from './components/HeroBackground';
export { AnimatedElement, FadeIn } from './components/AnimatedElement';
export { SkeletonLoader, PageSkeletons } from './components/SkeletonLoader';
export {
  EventActivityFeed,
  LiveBookingCounter, // Legacy export
  SocialProofBadge,
  TrustIndicators,
  SocialProofSection
} from './components/SocialProof';

// Layout Components
export { Section } from './components/Section';
export { Container } from './components/Container';
export { ImageWithOverlay } from './components/ImageWithOverlay';
export { ModernCard } from './components/ModernCard';

// Interactive Components
export { Button } from './components/Button';

// Patterns
export { 
  OrganicBackground,
  LeafShape,
  WaveShape,
  BlobShape,
  CirclePattern,
  GridPattern
} from './patterns/OrganicShapes';

// Visualizations
export { EventAvailabilityCalendar } from './visualizations/EventAvailabilityCalendar';
export { PricingDisplay, PriceCard, ProductCard } from './visualizations/PricingDisplay';

// Re-export tokens for convenience
export { tokens } from './tokens';